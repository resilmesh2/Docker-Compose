import asyncio
import json
import logging
import os.path
import re
from logging.handlers import RotatingFileHandler

import ndjson
from nats.aio.client import Client as NATS
from settings import (
    NATS_URL,
    SUBSCRIBE_QUEUE,
    SUBSCRIBE_SUBJECT,
    SUBSCRIBER_LOG_FILE,
    log_format,
)
from utils.nats_callbacks import (
    closed_cb,
    disconnected_cb,
    error_cb,
    reconnected_cb
)
from utils.parse import IOCUtils
from utils.subscriberState import (
    DomainFileHandler,
    IPV4FileHandler,
    IPV6FileHandler,
    SubscriberState,
    UnknownTypeFileHandler,
)

logger = logging.getLogger("subscriber")
log_file_handler = RotatingFileHandler(
    SUBSCRIBER_LOG_FILE, maxBytes=100_000_000, backupCount=5
)
log_file_handler.setFormatter(log_format)
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(log_file_handler)

"""
Receive events from NATS and store them as json files for further enrichment
"""


def sanitize_source(consumed_message: dict) -> tuple:
    update_key = "other"
    update_value = ""
    try:
        if (consumed_message.get("source", {}) or {}).get("ip"):
            update_key = "ip"
        if (consumed_message.get("source", {}) or {}).get("domain"):
            update_key = "domain"
        if (consumed_message.get("source", {}) or {}).get("url"):
            update_key = "url"
        update_value = re.sub(
            r"(\\.)|[^a-zA-Z0-9\.\;,\/\?\:\@\&\=\+\$\-\_\!\~\*'\(\)#]",
            "",
            consumed_message.get("source", {}).get(update_key),
        )
    except TypeError as e:
        logger.warning(f"Can't sanitize source: {e}")
    return update_key, update_value


def append_event_to_file(file_handler, event):
    # @TODO: should we skip already seen events?
    """
    cache_key = event.get("source").__str__().strip("{}").replace("'", "")
    cached_event = redis.get(cache_key)
    if cached_event:
        logger.info(f"Skipping cached event {cache_key}")
        return
    """
    if not os.path.exists(file_handler.current_file):
        file_handler.lock_file()
    with open(file_handler.current_file, "a") as file:
        writer = ndjson.writer(file, ensure_ascii=False)
        writer.writerow(event)
        file_handler.count_lines()
        logger.info(
            f"saving {event.get('source')} to {file.name} "
            f"({file_handler.lines} lines)"
        )
        # redis.set(cache_key, cache_key, ex=86400)  # 1 day
    if file_handler.lines >= 99:
        file_handler.auto_release_lock.cancel()
        file_handler.refresh()


async def save_events(msg):
    try:
        # async for msg in queue.messages[:2]:
        consumed_message = json.loads(msg.data.decode())
        logger.info(
            f"new message from {subscriberState.get_subsriber_name()} queue: "
            f"{consumed_message.get('source')}"
        )
        update_key, update_value = sanitize_source(consumed_message)
        if not update_key:
            logger.info(f"skipping message {consumed_message}, not ECS?")
        consumed_message.update({"source": {update_key: update_value}})
        ioc = str(consumed_message.get("source", {}).get(update_key))
        if ioc:
            ioc_info = IOCUtils(ioc).summary()
            if ioc_info.get("valid"):
                if ioc_info.get("type") == "domain":
                    append_event_to_file(DomainFileHandler, consumed_message)
                if ioc_info.get("type") == "ipv4":
                    append_event_to_file(IPV4FileHandler, consumed_message)
                if ioc_info.get("type") == "ipv6":
                    append_event_to_file(IPV6FileHandler, consumed_message)
                if ioc_info.get("type") not in ["domain", "ipv4", "ipv6"]:
                    logger.warning(
                        f"Not supported type: {ioc_info.get('type')}"
                    )
                    append_event_to_file(
                        UnknownTypeFileHandler, consumed_message
                    )
            else:
                logger.warning(f"discarding {ioc}, reason: {ioc_info}")
                append_event_to_file(UnknownTypeFileHandler, consumed_message)
        else:
            logger.warning(f"malformed event, no source? not ECS? {ioc}")
            append_event_to_file(UnknownTypeFileHandler, consumed_message)
    except Exception as e:
        await nc.close()
        logger.error(f"Exception: {e}")


async def receive_events():
    import socket

    logger.info(
        f"starting subscription: {subscriberState.get_subsriber_name()}"
    )
    await nc.connect(
        NATS_URL,
        name=socket.gethostname() + "[SUB]",
        error_cb=error_cb,
        closed_cb=closed_cb,
        disconnected_cb=disconnected_cb,
        reconnect_time_wait=60,
        reconnected_cb=reconnected_cb,
    )
    # @TODO: maybe a better approach is subscribing to batches of 100s like:
    """
    while True:
        nc.connect
        nc.subscribe(max_msgs=100) or nc.drain(100)
        ...process messages
        nc.close
    """
    subscriberState.queue = await nc.subscribe(
        SUBSCRIBE_SUBJECT,
        queue=SUBSCRIBE_QUEUE,
        cb=save_events,
        # max_msgs=100
    )
    while subscriberState.has_open_connection():
        await asyncio.sleep(0.001)
    logger.info("unsubscribing and closing")
    await subscriberState.queue.unsubscribe()
    await nc.close()


if __name__ == "__main__":
    # subscriber state manages information about the queue status
    subscriberState = SubscriberState()
    DomainFileHandler.refresh()
    IPV4FileHandler.refresh()
    IPV6FileHandler.refresh()
    nc: NATS = NATS()
    logger.info("!!! starting Silent Push - enrichment subscriber !!!")
    asyncio.run(receive_events())
