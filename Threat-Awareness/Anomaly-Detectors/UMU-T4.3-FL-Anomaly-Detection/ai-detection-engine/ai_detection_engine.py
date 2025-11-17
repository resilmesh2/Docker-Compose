"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow logging

import tensorflow as tf
tf.get_logger().setLevel('ERROR')  # Suppress TensorFlow logging from the logger

from utils import (
    create_no_logging_flask_app,
    create_custom_logger,
    parse_config_ai_detection_engine,
    build_anomaly_alert,
    load_dataset,
    preprocess_testing_data,
    test_model,
)
from preprocessor import (
    normalize_w_scaler
)
from model_manager import (
    load_model_from_data,
    load_scaler_from_data,
    load_encoder_from_data
)
import numpy as np
import pandas as pd
import json
import time
import threading
import asyncio

from flask import request, jsonify

CONFIG_PATH = 'config/ai_detection_engine.conf'

def evaluate(encoded_flow, confidence_threshold, logger):
    global current_model, current_scaler, current_encoder, current_feature_names, model_lock

    # Lock before reading the model, scaler, encoder, and feature names
    with model_lock:
        model_to_use = current_model
        scaler_to_use = current_scaler
        encoder_to_use = current_encoder
        feature_names_to_use = current_feature_names

    start_time_decoding = time.time()
    logger.info('PROCESSING: Decoding current flow information')
    decoded_flow = json.loads(encoded_flow.data.decode('utf-8'))
    logger.info('RESULT: Current flow information successfully decoded')
    end_time_decoding = time.time()

    time_decoding = round(end_time_decoding - start_time_decoding, 6) * 1000
    logger.info(f'TIME: Decoding the flow received took {time_decoding} milliseconds.')

    start_time_preprocessing = time.time()

    up_ip, down_ip, up_port, down_port = decoded_flow["features"][1], decoded_flow["features"][2], \
        decoded_flow["features"][3], decoded_flow["features"][4]

    filtered_feature_names = [feature for feature in feature_names_to_use if feature != "Label"]
    flow_df = pd.DataFrame([decoded_flow["features"][5:]], columns=filtered_feature_names)

    logger.info('PROCESSING: Normalizing values on current flow using existing scaler')
    flow = normalize_w_scaler(flow_df, scaler_to_use, logger)

    end_time_preprocessing = time.time()
    time_preprocessing = round(end_time_preprocessing - start_time_preprocessing, 6) * 1000
    logger.info(f'TIME: Preprocessing the flow received took {time_preprocessing} milliseconds.')

    start_time_prediction = time.time()
    logger.info('PROCESSING: Predicting current flow against trained model')

    predictions = model_to_use.predict(flow)
    predicted_label_idx = np.argmax(predictions, axis=1).astype(int)
    confidence = np.max(predictions, axis=1)[0]
    predicted_label = encoder_to_use.inverse_transform(predicted_label_idx)[0]

    if confidence < confidence_threshold:
        predicted_label = "Unknown"

    end_time_prediction = time.time()
    time_prediction = round(end_time_prediction - start_time_prediction, 6) * 1000
    time_total = round(end_time_prediction - start_time_decoding, 6) * 1000
    logger.info(f'TIME: Predicting the flow received took {time_prediction} milliseconds.')
    logger.info(f'TIME: Evaluating (whole process) the flow received took {time_total} milliseconds.')

    if predicted_label != "Benign":
        logger.info(f'DETECTION: Anomalous flow detected and classified as: {predicted_label}.')

        return predicted_label, confidence, flow_df.to_dict(orient='records')[0], up_ip, down_ip, up_port, down_port
    else:
        return predicted_label, None, None, up_ip, down_ip, up_port, down_port


def start(model_polling_interval, testing_data_path, nats_server_url, consumer_subject, producer_subject, confidence_threshold, logger):
    global current_model, current_scaler, current_encoder, current_feature_names

    # Wait until the model and its parameters are set
    while current_model is None or current_scaler is None or current_encoder is None or current_feature_names is None:
        logger.info('GENERAL: Waiting for the initial model and additional parameters...')
        time.sleep(model_polling_interval)

    # Load testing data and compute accuracy (to be included in alert metadata)
    testing_df = load_dataset(testing_data_path, logger)
    x_test, y_test = preprocess_testing_data(testing_df, logger)
    accuracy = test_model(current_model, x_test, y_test, current_encoder, logger)

    async def run_nats_loop():
        from nats.aio.client import Client as NATS
        nc = NATS()
        await nc.connect(servers=[nats_server_url])
        logger.info(f"GENERAL: Connected to NATS server at {nats_server_url}")

        async def message_handler(msg):
            nonlocal accuracy, nc
            predicted_label, conf, flow_features, up_ip, down_ip, up_port, down_port = evaluate(msg, confidence_threshold, logger)
            if predicted_label != "Benign":
                alert = build_anomaly_alert(accuracy, predicted_label, conf, up_ip, down_ip, up_port, down_port, flow_features)
                await nc.publish(producer_subject, alert.encode('utf-8'))
                logger.info('RESULT: Abnormal flow metadata successfully published on alerts subject')

        await nc.subscribe(consumer_subject, cb=message_handler)
        logger.info(f"GENERAL: Subscribed to subject '{consumer_subject}' for evaluation flows.")

        # Keep the async loop running
        while True:
            await asyncio.sleep(1)

    # Run the async NATS loop in this thread
    asyncio.run(run_nats_loop())


if __name__ == "__main__":
    # Create Flask API to receive new models
    app = create_no_logging_flask_app()

    # Define current-model-related variables (they may change when a new model is set)
    current_model = None
    current_scaler = None
    current_encoder = None
    current_feature_names = None

    # Create a lock to avoid concurrency problems when replacing the detection model  
    model_lock = threading.Lock()

    # Create custom logger
    logger = create_custom_logger("Real-time AI-based Detection Engine")

    # Read parameters from configuration file (model_polling_interval, testing_data_path, broker_url, consumer_topic, producer_topic, classificator_url)
    (
        api_port,
        model_polling_interval,
        testing_data_path,
        nats_server_url,
        consumer_subject,
        producer_subject,
        confidence_threshold
    ) = parse_config_ai_detection_engine(CONFIG_PATH, logger)

    threading.Thread(target=start, args=(
        model_polling_interval,
        testing_data_path,
        nats_server_url,
        consumer_subject,
        producer_subject,
        confidence_threshold,
        logger)
    ).start()

    @app.route('/updateModel', methods=['POST'])
    def update_model():
        global current_model, current_scaler, current_encoder, current_feature_names, logger
        logger.info("RESULT: New model (and its additional parameters) has been received")
        
        if current_model is None:
            logger.info("PROCESSING: Setting the new model as first detection model...")
        else:
            logger.info("PROCESSING: Replacing the existing model for the new one...")

        data = request.json
        model_json, model_weights, scaler_base64, \
            encoder_base64, current_feature_names = (
                data['model_json'],
                data['model_weights'],
                data['scaler'],
                data['encoder'],
                data['feature_names']
            )

        new_model = load_model_from_data(model_json, model_weights)
        new_scaler = load_scaler_from_data(scaler_base64)
        new_encoder = load_encoder_from_data(encoder_base64)

        if new_model is not None and new_scaler is not None and new_encoder is not None and current_feature_names is not None:
            with model_lock:
                current_model = new_model
                current_scaler = new_scaler
                current_encoder = new_encoder
                logger.info("RESULT: New model has been set. Sending response...")
            return jsonify({"message": "Model, scaler, encoder and training feature names updated"}), 200
        else:
            logger.info("FAILURE: Failed to update the model. Keeping the old settings")
            return jsonify({"message": "Failed to update model, scaler, encoder and training feature names"}), 400
    
    app.run(host="0.0.0.0", port=api_port)

