"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

from preprocessor import (
    remove_flow_ids,
    convert_object_to_cat,
    replace_inf_to_nan,
    remove_high_null_samples,
    imput_nan_values,
    label_encode,
    normalize,
    merge_dataframes
)
from datetime import datetime
from sklearn.metrics import (
    accuracy_score,
    recall_score,
    precision_score,
    f1_score
)
import pandas as pd
import numpy as np
from flask import Flask
import logging
import json
import sys

def parse_config_ai_detection_engine(config_file_path, logger):
    logger.info(
        f"GENERAL: Loading configuration parameters from file \'{config_file_path}\'..."
    )
    
    with open(config_file_path, "r") as file:
        config = json.load(file)
    
    api_port = str(config["ai_detection_engine"]["listening_port"])
    model_polling_interval = int(config["ai_detection_engine"]["model_polling_interval"])
    testing_data_path = str(config["ai_detection_engine"]["testing_data_path"])
    nats_server_url = str(config["ai_detection_engine"]["nats_server_url"])
    consumer_subject = str(config["ai_detection_engine"]["consumer_subject"])
    producer_subject = str(config["ai_detection_engine"]["producer_subject"])
    confidence_threshold = float(config["ai_detection_engine"]["confidence_threshold"])

    logger.info(
        'RESULT: Parameters from configuration file have been successfully loaded'
    )

    return (
        api_port,
        model_polling_interval,
        testing_data_path,
        nats_server_url,
        consumer_subject,
        producer_subject,
        confidence_threshold
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

def preprocess_testing_data(df, logger):
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

    # Convert columns of type Object to type Category
    df = convert_object_to_cat(df, logger)

    # Imput NaN values in both categorical and numerical variables
    df_num_imputed, df_cat_imputed = imput_nan_values(df, logger)

    # Merge the two dataframe versions in one
    if not df_cat_imputed.empty:
        df = merge_dataframes(df_num_imputed, df_cat_imputed)
    else:
        df = df_num_imputed

    logger.info(
        'PROCESSING: Label encoding categorical values (if any)...'
    )
    # Apply label encoding over categorical variables
    df = label_encode(df, logger)

    logger.info(
        'PROCESSING: Normalizing values and splitting into training and testing sets...'
    )
    # Normalize values
    df = normalize(df, logger, label_present=True)

    x_test = df.drop(columns=["Label"]).to_numpy() 
    y_test = df["Label"].to_numpy()

    return x_test, y_test

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

def create_no_logging_flask_app():
    cli = sys.modules['flask.cli']
    cli.show_server_banner = lambda *x: None

    app = Flask(__name__)
    logging.getLogger('werkzeug').disabled = True
    return app

def test_model(model, x_test, y_test, encoder, logger):
    y_pred = np.argmax(model.predict(x_test), axis=1)

    y_test = encoder.transform(y_test)
   
    accuracy = accuracy_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred, average='weighted')  
    precision = precision_score(y_test, y_pred, average='weighted')  
    f1 = f1_score(y_test, y_pred, average='weighted')

    logger.info(f'RESULT: Accuracy: {round(accuracy, 4)}')
    logger.info(f'RESULT: Recall: {round(recall, 4)}')
    logger.info(f'RESULT: Precision: {round(precision, 4)}')
    logger.info(f'RESULT: F1 Score: {round(f1, 4)}')

    return accuracy

def build_anomaly_alert(accuracy, attack_type, confidence, up_ip, down_ip, up_port, down_port, flow_features):
    json_data = {
        "attack_flow_alert": {
            "datetime": str(datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")),
            "source_ip": str(up_ip),
            "source_port": up_port,
            "destination_ip": str(down_ip),
            "destination_port": down_port,
            "multi_class_accuracy": accuracy,
            "attack_type": str(attack_type),
            "confidence": float(confidence),
            "flow_features": flow_features
        }
    }
    
    json_string = json.dumps(json_data, indent=2)

    return json_string


