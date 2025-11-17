import asyncio
import logging
import os
from logging.handlers import RotatingFileHandler

from filelock import FileLock, Timeout
from settings import EVENTS_DIR, PUBLISHER_LOG_FILE, log_format
from utils.api import bulk_publish_messages
from utils.custom_ndjson_reader import CustomNDJSONReader
from utils.subscriberState import SubscriberState
from utils.utils import skip_current_file

"""
Handle unknown type events (not IPV4/6 nor domain), it doesn't enrich
"""


logger = logging.getLogger("unknown_type_publisher")
log_file_handler = RotatingFileHandler(
    PUBLISHER_LOG_FILE, maxBytes=100_000_000, backupCount=5
)
log_file_handler.setFormatter(log_format)
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(log_file_handler)


async def handle_unknown_events_type():
    while True:
        path = f"{EVENTS_DIR}outbound/unknown/"
        with os.scandir(path) as files:
            # logger.info(f"files {files}")
            for file in files:
                # logger.info(f"file {file.name}")
                lock = FileLock(path + file.name + ".lock", thread_local=False)
                if skip_current_file(file, lock):
                    continue
                messages_to_publish = list()
                try:
                    with lock.acquire(timeout=10):
                        with open(path + file.name) as f:
                            reader = CustomNDJSONReader(f)
                            for line in reader:
                                if not line:
                                    continue
                                messages_to_publish.append(line)
                            await bulk_publish_messages(messages_to_publish, logger)
                    if os.path.exists(path + file.name):
                        os.remove(path + file.name)
                except Timeout:
                    logger.info(
                        f"Can't acquire lock on {lock.lock_file}"
                        f", locked? {lock.is_locked}, skipping..."
                    )
                finally:
                    lock.release()
                lock.release()


async def main():
    unknown_events_types_task = loop.create_task(handle_unknown_events_type())
    await asyncio.wait([unknown_events_types_task])
    return (("unknown_events_types_task", unknown_events_types_task),)


if __name__ == "__main__":
    logger.info("!!! starting Silent Push - Unknown event types publisher !!!")
    subscriberState = SubscriberState()
    subscriberState._open = False
    loop = asyncio.get_event_loop()
    loop.set_debug(1)
    (t1,) = loop.run_until_complete(main())
    loop.close()
