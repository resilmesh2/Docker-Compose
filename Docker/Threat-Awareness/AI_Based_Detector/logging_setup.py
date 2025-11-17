import logging
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
LOG_FILE = os.path.join(BASE_DIR, os.getenv("LOG_PATH"))
LOG_TO_CONSOLE = os.getenv("LOG_TO_CONSOLE", "false").lower() == "true"
LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "DEBUG").upper()

LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.DEBUG)
# set logging level for noisy unwanted module loggers
logging.getLogger("matplotlib").setLevel(logging.CRITICAL)
logging.getLogger("asyncio").setLevel(logging.CRITICAL)

logging.basicConfig(
    filename=LOG_FILE,
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-5s | %(name)-14s | %(message)s"
)

def get_logger(name: str):
    # print(f"log file: {LOG_FILE}")
    logger = logging.getLogger(name)
    logger.propagate = False
    if not logger.handlers:
        file_handler = logging.FileHandler(LOG_FILE)
        formatter = logging.Formatter("%(asctime)s | %(levelname)-5s | %(name)-14s | %(message)s")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        # Add console handler if flag is set
        if LOG_TO_CONSOLE:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
    return logger


