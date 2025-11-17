import logging
import os

import redis
from dotenv import load_dotenv

load_dotenv()

API_URL = os.environ.get("API_URL")
API_KEY = os.environ.get("API_KEY")
NATS_URL = os.environ.get("NATS_URL")
SUBSCRIBE_SUBJECT = os.environ.get("RAW_EVENTS_SUBJECT")
SUBSCRIBE_QUEUE = os.environ.get("SLP_SUBSCRIBE_QUEUE")
PUBLISH_SUBJECT = os.environ.get("ENRICHED_EVENTS_SUBJECT")
SUBSCRIBER_LOG_FILE = os.environ.get("SUBSCRIBER_LOG_FILE", "subscriber.log")
PUBLISHER_LOG_FILE = os.environ.get("PUBLISHER_LOG_FILE", "publisher.log")
LOG_LEVEL = int(os.environ.get("LOG_LEVEL", logging.INFO))
EVENTS_DIR = os.environ.get("EVENTS_DIR", "./events/")
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = os.environ.get("REDIS_PORT", 6379)
redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

logging.basicConfig(level=LOG_LEVEL)
log_format = logging.Formatter(
    "[%(asctime)s %(levelname)s] %(message)s", "%d-%m-%Y %H:%M:%S"
)

