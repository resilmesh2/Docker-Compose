import argparse
import asyncio
import http
import logging
import os
from logging.handlers import RotatingFileHandler
from math import floor

from filelock import FileLock, Timeout
from settings import API_URL, PUBLISHER_LOG_FILE, log_format
from utils.api import (
    bulk_publish_messages,
    do_request,
    prepare_domains_to_publish,
    get_cached_events,
    set_cached_events
)
from utils.custom_ndjson_reader import CustomNDJSONReader
from utils.subscriberState import SubscriberState

"""
Enriches Domain events from NATS using Silent Push API
"""


logger = logging.getLogger("domain_publisher")
log_file_handler = RotatingFileHandler(
    PUBLISHER_LOG_FILE, maxBytes=100_000_000, backupCount=5
)
log_file_handler.setFormatter(log_format)
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(log_file_handler)
parser = argparse.ArgumentParser()
parser.add_argument("event")
parser.add_argument("event_type")
args = parser.parse_args()


def bulk_enrich_domains(domains: set) -> list:
    if not domains:
        return []
    # _URI = API_URL + "explore/bulk/summary/domain?explain=1&scan_data=1"
    _URI = API_URL + "explore/bulk/summary/domain?explain=1"
    logger.info(f"Enriching {len(domains)} domains")
    domains = list(set(domains))
    enriched_data, status_code = do_request({"domains": domains}, _URI, logger)
    if status_code == http.HTTPStatus.SERVICE_UNAVAILABLE:
        subscriberState.close_connection()
    if not enriched_data:
        logger.info(f"No enriched data: {enriched_data}")
    try:
        enriched_data = list(
            map(  # calculates Wazuh rule level based on SLP risk score
                lambda i:
                dict(i, wazuh_rule_level=floor((i.get('sp_risk_score') or 0) / 6.5)) if isinstance(i, dict) else None,
                enriched_data
            )
        )
    except AttributeError as e:
        logger.warning(f"skipping, attribute error {e}")
    return enriched_data


async def enrich_domains(event):
    logger.info(f"file {event}")
    lock = FileLock(f"{event}.lock", thread_local=False)
    domains = list()
    messages_to_publish = list()
    try:
        with lock.acquire(timeout=5):
            with open(event) as f:
                reader = CustomNDJSONReader(f)
                for line in reader:
                    if not line:
                        continue
                    domains.append(
                        (line.get("source", {}) or {}).get("domain")
                    )
                    domains.append(
                        (line.get("destination", {}) or {}).get("domain")
                    )
                    messages_to_publish.append(line)
                if not domains:
                    return
                enriched_cache, new_domains = get_cached_events(set(domains), logger)
                enriched_domains = bulk_enrich_domains(set(new_domains))
                if enriched_cache:
                    enriched_domains.extend(enriched_cache)
                messages_to_publish = prepare_domains_to_publish(
                    enriched_domains, messages_to_publish, logger
                )
                set_cached_events(enriched_domains, logger)
                await bulk_publish_messages(messages_to_publish, logger)
        if os.path.exists(event):
            os.remove(event)
    except FileNotFoundError:
        pass
    except Timeout:
        logger.info(
            f"Can't acquire lock on {lock.lock_file}"
            f", locked? {lock.is_locked}, skipping..."
        )
    finally:
        lock.release()
    lock.release()


async def main():
    if args.event_type == "deleted":
        return ((None, None),)
    logger.info(f"{args.event_type}: {args.event}")
    enrich_domains_task = loop.create_task(enrich_domains(args.event))
    await asyncio.wait([enrich_domains_task])
    return (("enrich_domains_task", enrich_domains_task),)


if __name__ == "__main__":
    logger.info("!!! starting Silent Push - Domain enrichment publisher !!!")
    subscriberState = SubscriberState()
    subscriberState._open = False
    loop = asyncio.get_event_loop()
    loop.set_debug(1)
    (t1,) = loop.run_until_complete(main())
    loop.close()
