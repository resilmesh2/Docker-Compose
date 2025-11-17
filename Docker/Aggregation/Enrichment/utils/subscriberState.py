import os
import shutil
import socket
import time
from abc import ABC
from threading import Timer

from filelock import FileLock, Timeout
from nats.aio.subscription import Subscription
from settings import EVENTS_DIR


class BaseFileHandler(ABC):
    auto_release_lock: Timer = None
    current_file = ""

    @classmethod
    def release_lock(cls, lock):
        from subscriber import logger

        logger.info(f"releasing lock for {lock.lock_file}")
        lock.release()
        if os.path.exists(cls.current_file):
            cls.move_file()

    @classmethod
    def lock_file(cls):
        from subscriber import logger

        cls.lock = FileLock(cls.current_file + ".lock", thread_local=False)
        cls.auto_release_lock = Timer(5, cls.release_lock, args=(cls.lock,))
        cls.auto_release_lock.start()
        try:
            cls.lock.acquire(timeout=5)
        except Timeout:
            logger.error(f"Timeout locking {cls.current_file}")

    @classmethod
    def move_file(cls):
        shutil.copy(cls.current_file, cls.current_file.replace("inbound", "outbound"))
        os.remove(cls.current_file)

    @classmethod
    def refresh(cls):
        if os.path.exists(cls.current_file):
            cls.move_file()
        cls.files = len(os.listdir(cls.PATH))
        cls.current_file = f"{cls.PATH}{str(time.time_ns())}.ndjson"
        cls.count_lines()

    @classmethod
    def count_lines(cls):
        cls.lines = sum(
            1
            for _ in (
                open(cls.current_file) if os.path.isfile(cls.current_file) else []
            )
        )


class DomainFileHandler(BaseFileHandler):
    PATH = EVENTS_DIR + "inbound/domains/"
    files = 0
    current_file = f"{PATH}{files}.ndjson"
    lines = 0
    lock = FileLock(current_file + ".lock", thread_local=False)


class IPV4FileHandler(BaseFileHandler):
    PATH = EVENTS_DIR + "inbound/ipv4s/"
    files = 0
    current_file = f"{PATH}{files}.ndjson"
    lines = 0
    lock = FileLock(current_file + ".lock", thread_local=False)


class IPV6FileHandler(BaseFileHandler):
    PATH = EVENTS_DIR + "inbound/ipv6s/"
    files = 0
    current_file = f"{PATH}{files}.ndjson"
    lines = 0
    lock = FileLock(current_file + ".lock", thread_local=False)


class UnknownTypeFileHandler(BaseFileHandler):
    PATH = EVENTS_DIR + "inbound/unknown/"
    files = 0
    current_file = f"{PATH}{files}.ndjson"
    lines = 0
    lock = FileLock(current_file + ".lock", thread_local=False)


# Using a class to handle out of scope variables or functionality as asyncio is used.
# This is one of the Python ways of avoiding globals, and or providing "global-like" functionality


class SubscriberState:
    __author__ = (
        "https://github.com/kamauwashington/nats-queue-api-python/"
        "blob/main/subscriberState.py"
    )
    queue: Subscription = None
    domains_to_enrich: list = list()
    domains_to_publish: list = list()
    ipv4s_to_enrich: list = list()
    ipv4s_to_publish: list = list()
    ipv6s_to_enrich: list = list()
    ipv6s_to_publish: list = list()
    messages_to_publish: list = list()
    pause_subscription: bool = False

    def __init__(self):
        # this property is used to control the loop keeping the wait state open to recieve messages
        self._open: bool = True
        # generate a coolname for this subscriber
        self._subscriberName: str = (
            "sub_" + socket.gethostname() + "_" + str(int(time.time()))
        )

    # this method will be used to top the iteration that keeps the subscriber open
    # a .wait() method could be added here to keep the connection alive as well
    def close_connection(self) -> None:
        self._open = False

    # identifies if the subscriber state is stile alive
    def has_open_connection(self) -> bool:
        return self._open

    # returns the name of the subscriber process
    def get_subsriber_name(self) -> str:
        return self._subscriberName
