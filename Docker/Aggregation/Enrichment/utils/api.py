import asyncio
import http
import json
import time

import requests
from settings import redis, API_KEY, NATS_URL, PUBLISH_SUBJECT
from utils.utils import dict_replace


def do_request(payload: dict, uri: str, logger) -> tuple:
    response = None
    try:
        response = requests.post(
            uri,
            json=payload,
            headers={"x-api-key": API_KEY, "User-Agent": "Resilmesh-ph1"},
        )
    except requests.HTTPError:
        logger.error("HTTP Error on enrichment")
        response = retry_request(uri, payload, logger)
    except requests.ConnectTimeout:
        logger.error("Connect Timeout Error on enrichment")
        response = retry_request(uri, payload, logger)
    except requests.exceptions.ProxyError:
        logger.error("Proxy Error on enrichment")
        response = retry_request(uri, payload, logger)
    if response:
        logger.debug(f"Response Status: {response.status_code}")
        if response.status_code == http.HTTPStatus.SERVICE_UNAVAILABLE:
            return dict(), response.status_code
            response = retry_request(url, payload, logger) or response
        if response.status_code != 200:
            try:
                payload_ioc = payload.get("ips")[0] or payload.get("domains")[0]
            except IndexError:
                payload_ioc = "no payload passed?"
            logger.warning(f"Can't enrich [{payload_ioc}, ...] :(")
            logger.warning(response.content)
            return dict(), response.status_code
        time.sleep(1)  # let the servers breath
        dict_response = json.loads(response.content).get("response")
        return dict_replace(dict_response), response.status_code
    return dict(), response


def retry_request(url, payload, logger, attempts: int = 10):
    for attempt in range(attempts):
        logger.warning(f"Retrying enriching, attempt {attempt}...")
        time.sleep(30)
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"x-api-key": API_KEY, "User-Agent": "Resilmesh-ph1"},
            )
            if response.status_code == 200:
                return response
            else:
                logger.debug(f"Retry response Status: {response.status_code}")
        except Exception as e:
            logger.error(f"Retry exception: {e}")
    logger.warning(f"Retry failed after {attempts} attempts :(")


# @TODO: generator maybe?
# @TODO: publish to different subjects namespaces for scalability like:
#   enriched.ipv4s, enriched.ipv6s, enriched.domains, enriched.urls, ...
async def bulk_publish_messages(messages_to_publish, logger):
    import socket

    from nats.aio.client import Client as NATS
    from utils.nats_callbacks import (
        closed_cb,
        disconnected_cb,
        error_cb,
        reconnected_cb,
    )

    nc: NATS = NATS()
    await nc.connect(
        NATS_URL,
        name=socket.gethostname() + "[PUB]",
        error_cb=error_cb,
        closed_cb=closed_cb,
        disconnected_cb=disconnected_cb,
        reconnect_time_wait=60,
        reconnected_cb=reconnected_cb,
    )
    for message_to_publish in messages_to_publish:
        logger.info(
            f"publishing message to {PUBLISH_SUBJECT}: "
            f"{message_to_publish.get('source')}"
        )
        await nc.publish(
            PUBLISH_SUBJECT,
            json.dumps(message_to_publish).encode(),
        )
    """
    IMPORTANT: nats APIs are async 'non blocking' (except flush and request)
    that means the messages are sent to a buffer and will be published in the
    future. If the client finishes before buffer is cleared, we may lose mgs
    """
    await nc.flush(timeout=60)  # to guarantee delivery
    await nc.close()


def get_cached_events(events: list or set, logger) -> tuple:
    cached_events = list()
    uncached_events = list()
    for event in events:
        cache_key = event.__str__().strip("{}").replace("'", "")
        event_cache = redis.get(cache_key)
        if event_cache:
            logger.debug(f"cache hit '{event}'")
            cached_events.append(json.loads(event_cache))
        else:
            logger.debug(f"cache miss '{event}'")
            uncached_events.append(event)
    return cached_events, uncached_events


def set_cached_events(events, logger):
    for event in events:
        try:
            cache_key = event.get("ip").__str__().strip("{}").replace("'", "")
            if redis.get(cache_key):
                continue
            redis.set(cache_key, json.dumps(event), ex=86400)  # 1 day
        except AttributeError as e:
            logger.warning(f"caching failed: {e}")


# @TODO: generator maybe?
def prepare_ips_to_publish(enriched_ips: dict, messages: list, logger) -> list:
    for message in messages:
        searched_ip = message.get("source").get("ip")
        try:
            enriched_ip = next(ip for ip in enriched_ips if ip["ip"] == searched_ip)
            enriched_ip.setdefault(
                "_help", "https://help.silentpush.com/docs/enrichment-screen"
            )
            message.setdefault("silent_push", enriched_ip)
            logger.debug(f"Enriched {enriched_ip.get('ip')}")
        except StopIteration:
            logger.warning(f"Can't find enriched data for {searched_ip} :(")
        except TypeError:
            logger.warning(f"Enrichment response malformed: {enriched_ips}")
    return messages


# @TODO: check if correct field is ['domaininfo']['domain'] or ['domaininfo']['query']
def prepare_domains_to_publish(enriched_domains: dict, messages: list, logger) -> list:
    for message in messages:
        searched_domain = message.get("source").get("domain")
        try:
            enriched_domain = next(
                domain
                for domain in enriched_domains
                if domain.get("domaininfo", {})["domain"] == searched_domain
            )
            enriched_domain.setdefault(
                "_help", "https://help.silentpush.com/docs/enrichment-screen"
            )
            message.setdefault("silent_push", enriched_domain)
        except StopIteration:
            logger.warning(f"Can't find enriched data for {searched_domain} :(")
        except TypeError:
            logger.warning(f"Enrichment response malformed: {enriched_domains}")
        except AttributeError:
            logger.warning(f"Enrichment response malformed: {enriched_domains}")
    return messages
