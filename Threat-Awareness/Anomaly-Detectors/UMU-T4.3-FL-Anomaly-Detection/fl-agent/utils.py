"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

from model_manager import (
    save_model_to_data,
    save_scaler_to_data,
    save_encoder_to_data
)
from preprocessor import (
    remove_flow_ids,
    convert_object_to_cat,
    replace_inf_to_nan,
    remove_high_null_samples,
    imput_nan_values,
    merge_dataframes,
    label_encode,
    normalize_and_split,
)
import requests
import logging
import json
import sys
import pandas as pd

def parse_config_fl_agent(config_file_path, logger):
    logger.info(
        f"GENERAL: Loading configuration parameters from file \'{config_file_path}\'..."
    )
    
    with open(config_file_path, "r") as file:
        config = json.load(file)
    
    training_data_path = str(config["fl_agent"]["training_data_path"])
    aggregator_url = str(config["fl_agent"]["aggregator_url"])
    detector_url = str(config["fl_agent"]["detector_url"])
    local_epochs = int(config["fl_agent"]["local_epochs"])
    batch_size = int(config["fl_agent"]["batch_size"])
    steps_per_epoch = int(config["fl_agent"]["steps_per_epoch"])
    test_size = float(config["fl_agent"]["test_size"])
    noise_mechanism = str(config["fl_agent"]["noise_mechanism"])

    logger.info(
        'RESULT: Parameters from configuration file have been successfully loaded'
    )

    return (
        training_data_path,
        aggregator_url,
        detector_url,
        local_epochs,
        batch_size,
        steps_per_epoch,
        test_size,
        noise_mechanism
    )

def load_dataset(dataset_path, logger):
    logger.info(
        f'PROCESSING: Loading dataset from file \'{dataset_path}\'...'
    )
    df = pd.read_csv(dataset_path)

    logger.info(
        'RESULT: Dataset has been successfully loaded'
    )

    return df

def preprocess_data(df, test_size, logger):
    logger.info('GENERAL: Pre-processing data...')
    logger.info('PROCESSING: Removing flow identificators (IPs, ports)...')
    df = remove_flow_ids(df, logger)

    # Convert columns of type Object to type Category
    logger.info(
        'PROCESSING: Converting categorical columns from Object to Category type, if necessary...'
    )
    df = convert_object_to_cat(df, logger)

    logger.info(
        'PROCESSING: Replacing infinite values for NaN values...'
    )
    # Replace INF values for NaN values
    df = replace_inf_to_nan(df, logger)

    logger.info(
        'PROCESSING: Removing high null samples (percentage exceeding threshold)...'
    )
    # Remove samples whose null percentage exceed threshold
    df = remove_high_null_samples(df, logger)

    logger.info(
        'PROCESSING: Imputing NaN values in both categorical and numerical columns, if any...'
    )

    # Imput NaN values in both categorical and numerical variables
    df_num_imputed, df_cat_imputed = imput_nan_values(df, logger)

    # Merge the two dataframe versions in one
    if not df_cat_imputed.empty:
        df = merge_dataframes(df_num_imputed, df_cat_imputed)
    else:
        df = df_num_imputed

    df = convert_object_to_cat(df, logger)
    
    logger.info(
        'PROCESSING: Label encoding categorical values (if any)...'
    )

    # Apply label encoding over categorical variables
    df, encoder = label_encode(df, logger)

    logger.info(
        'PROCESSING: Normalizing values and splitting into training and testing sets...'
    )
    # Normalize values
    x_train, x_test, y_train, y_test, scaler = normalize_and_split(df, test_size, logger)

    return x_train, x_test, y_train, y_test, list(df.columns), df['Label'].nunique(), scaler, encoder

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

def send_model_to_detector(model, scaler, encoder, feature_names, detector_url, logger):
    logger.info("PROCESSING: Serializing model, scaler and encoder...")
    model_json, model_weights = save_model_to_data(model)
    scaler_base64 = save_scaler_to_data(scaler)
    encoder_base64 = save_encoder_to_data(encoder)
    logger.info("RESULT: Model, scaler and encoder successfully serialized")

    payload = {
        'model_json': model_json,
        'model_weights': model_weights,
        'scaler': scaler_base64,
        'encoder': encoder_base64,
        'feature_names': feature_names
    }

    logger.info("GENERAL: Sending model to the Detection Engine...")
    
    headers = {
        'Content-Type': 'application/json',
    }
    response = requests.post(f"http://{detector_url}/updateModel", json=payload, headers=headers)
    
    if response.status_code == 200:
        logger.info("RESULT: Model successfully sent to the Detection Engine")
    else:
        logger.info("FAILURE: Error when sending model to the Detection Engine")
    print(response.text)
