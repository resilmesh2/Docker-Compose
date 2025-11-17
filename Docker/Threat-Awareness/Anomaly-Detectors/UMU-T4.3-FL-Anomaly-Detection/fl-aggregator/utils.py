"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import logging
import sys
import json

def parse_config_fl_aggregator(config_file_path, logger):
    logger.info(
        f"GENERAL: Loading configuration parameters from file \'{config_file_path}\'..."
    )
    
    with open(config_file_path, "r") as file:
        config = json.load(file)
    
    fl_rounds = int(config["fl_aggregator"]["fl_rounds"])
    min_clients = int(config["fl_aggregator"]["min_clients"])
    mu_protected = bool(config["fl_aggregator"]["mu_protected"])
    listening_port = int(config["fl_aggregator"]["listening_port"])

    logger.info(
        'RESULT: Parameters from configuration file have been successfully loaded'
    )

    return (
        fl_rounds,
        min_clients,
        mu_protected,
        listening_port
    )

class CustomFormatter(logging.Formatter):
    colors = {
        "GENERAL": "\x1b[34m",  # Blue
        "PROCESSING": "\x1b[38;5;208m",  # Orange
        "RESULT": "\x1b[32m",  # Green
        "FAILURE": "\x1b[38;5;88m", # Garnet Red
        "DETECTION": "\x1b[31m",  # Red
        "TIME": "\x1b[36m",  # Purple
    }
    reset = "\x1b[0m"

    def format(self, record):
        original_format = self._fmt
        formatted_message = super(CustomFormatter, self).format(record)

        for name in self.colors:
            if name in record.msg:
                formatted_message = formatted_message.replace(
                    name, f"{self.colors[name]}{name}{self.reset}")
                break

        self._fmt = original_format
        return formatted_message

def create_custom_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    c_handler = logging.StreamHandler(sys.stdout)

    custom_format = CustomFormatter(
        '[%(asctime)s - %(name)s] %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    c_handler.setFormatter(custom_format)

    logger.addHandler(c_handler)

    return logger
