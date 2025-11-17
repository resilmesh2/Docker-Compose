import os
import json
import time
import pickle
import logging
import asyncio
import threading
from datetime import datetime
import joblib

import numpy as np
import pandas as pd
from streamz import Stream
from dotenv import load_dotenv

from .config import DEFAULT_IMPORTANT_FEATURES
from models_server.data_scheme import cNetworkData, cSensorData
# from .. import logging_setup
from logging_setup import get_logger
# Load environment variables from .env file in the main script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, "..", ".env")
load_dotenv(env_path)

TCP_HOST_IP             = os.getenv("TCP_HOST_IP")
NETWORK_DATA_TCP_PORT   = os.getenv("NETWORK_DATA_TCP_PORT")
SENSOR_DATA_TCP_PORT    = os.getenv("SENSOR_DATA_TCP_PORT")
EDGE_DEVICE_ID          = os.getenv("EDGE_DEVICE_ID")
NETWORK_ENCODER         = os.getenv("NETWORK_ENCODER")
NETWORK_SCALER          = os.getenv("NETWORK_SCALER")
SENSOR_SCALER           = os.getenv("SENSOR_SCALER")

class NetworkProbe:
    def __init__(self, network_stream=None):
        self.network_stream = network_stream or Stream(asynchronous=True)
        self._server = None
        self._server_task = None
        self.logger = get_logger("NetworkProbe")
        # self.logger = CustomLogger(LOGS_PATH)
        self.encoder = None
        self.scaler = None
        self.features_to_keep = DEFAULT_IMPORTANT_FEATURES
        self.flow_counter = 0
        self._lock = threading.Lock()
        self.detect_stream = self.network_stream.map(self._preprocess_and_parse_flow)
        self.logger.info("NetworkProbe initialized.")

    def _preprocess_and_parse_flow(self, b: bytes):
        """
        Preprocesses and parses a network flow represented as a JSON-encoded byte string.
        This method performs the following steps:
            1. Checks if the encoder and scaler are set and compatible with the expected feature count.
            2. Decodes the input bytes to a UTF-8 string, removing any trailing newline.
            3. Filters out empty strings.
            4. Parses the JSON string to extract feature values specified in `self.features_to_keep`.
            5. Encodes and scales the feature list using the provided encoder and scaler.
            6. Assembles the processed data into a `cNetworkData` object, including a timestamp and flow count.
            7. Returns the JSON representation of the `cNetworkData` object.
        Args:
            b (bytes): The input network flow as a JSON-encoded byte string.
        Returns:
            str or None: The JSON string of the processed network data package, or None if an error occurs.
        Raises:
            None: All exceptions are caught and logged internally.
        """
        if self.encoder is None or self.scaler is None:
            print("Error: Encoder or scaler not set. Please add them before starting a new capture session.")
            self.logger.error("Error: Encoder or scaler not set. Please add them before starting a new capture session.")
            return None
        if self.scaler.n_features_in_ != len(self.features_to_keep):
            print(f"Error: Scaler expects {self.scaler.n_features_in_} features, but {len(self.features_to_keep)} were provided.")
            self.logger.error(f"Error: Scaler expects {self.scaler.n_features_in_} features, but {len(self.features_to_keep)} were provided.")
            return None
        
        # above just sanity checks
        # 1. Drop newline and decode bytes to string
        s = b.rstrip(b"\n").decode("utf-8", "replace")
        
        # 2. Filter out empty strings
        if not s:
            return None
        # 3. Parse the JSON string and return the feature list
        try:
            js = json.loads(s)
            flow_list = [js.get(key, None) for key in self.features_to_keep]
            with self._lock:
                flow_list_encoded = self.encoder.transform([flow_list])
                # print(f"Encoded flow list: {flow_list_encoded}")
                flow_list_scaled = self.scaler.transform(np.array(flow_list_encoded))
                # print(f"Scaled flow list: {flow_list_scaled[0].tolist()}")
                #? assemble the cNetworkData object
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                log = {'flow_count': self.flow_counter}
                network_data_package = cNetworkData(EDGE_DEVICE_ID, timestamp, flow_list_scaled[0].tolist(), log) #TODO replace 1 with edge device if from .env file
                self.flow_counter += 1
                return network_data_package.to_json()
            
        except Exception as e:
            print(f"[JSON ERROR] {e} :: {s[:200]}")
            self.logger.exception(f"[JSON ERROR] {e} :: {s[:200]}")
            return None


    async def create_tcp_server(self, host=TCP_HOST_IP, port=NETWORK_DATA_TCP_PORT):
        """
        Asynchronously creates and starts a TCP server that listens for incoming connections.
        The server listens on the specified host and port (default: '0.0.0.0' and 9000).
        For each client connection, it reads incoming data line by line and emits each line
        to the `network_stream` asynchronously, supporting backpressure.
        Parameters:
            host (str): The hostname or IP address to bind the server to. Defaults to '0.0.0.0'.
            port (int): The port number to listen on. Defaults to 9000.
        Notes:
            - The server runs indefinitely until cancelled.
            - Properly closes client connections after communication ends.
            - Assumes `self.network_stream.emit` is an awaitable method for handling incoming data.
        """
        async def _handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
            try:
                while True:
                    line = await reader.readline()  # reads until b"\n" or EOF
                    if not line:
                        break
                    # IMPORTANT: in async mode, emit returns an awaitable — await it
                    await self.network_stream.emit(line)    # backpressure-friendly
            finally:
                try:
                    writer.close()
                    await writer.wait_closed()
                except Exception:
                    pass
        
        server = await asyncio.start_server(_handle_client, host, port)
        # print(f"TCP server listening on {host}:{port}")
        self.logger.info(f"TCP server listening on {host}:{port}")
        
        async with server:
            await server.serve_forever()

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        if self._server_task:
            self._server_task.cancel()
            try:
                await self._server_task
            except asyncio.CancelledError:
                self.logger.info("Server task cancelled.")
                pass

    def load_network_encoder(self):
        """
        Adds a custom encoder for handling multiple features for label encoding.
        """
        helper = self
        class MixedFeatureEncoder:
            def __init__(self, encoders):
                self.encoders = encoders

            def transform(self, X):
                # X is shape (n_samples, n_features)
                transformed_rows = []
                for row in X:
                    transformed = []
                    for feat, val in zip(helper.features_to_keep, row):
                        if feat in self.encoders:
                            # --- categorical feature ---
                            le = self.encoders[feat]

                            # Build mapping from label -> encoded index
                            mapping = dict(zip(le.classes_, le.transform(le.classes_)))

                            # If the encoder contains an '__unknown__' class, use its value
                            if "__unknown__" in mapping:
                                unknown_val = mapping["__unknown__"]
                            else:
                                print(f"Warning: No '__unknown__' class in encoder for feature '{feat}'. Using 0 as default.")
                                exit(-1)

                            # Map safely
                            encoded_val = mapping.get(val, unknown_val)

                            # Convert numpy scalar to plain int if necessary
                            if hasattr(encoded_val, "item"):
                                encoded_val = encoded_val.item()
                            transformed.append(encoded_val)
                        else:
                            # --- numerical or other feature ---
                            # Ensure it's a clean Python type (no numpy scalars)
                            if hasattr(val, "item"):
                                val = val.item()
                            transformed.append(val)
                    transformed_rows.append(transformed)
                return transformed_rows    
            
            def inverse_transform(self, X_enc):
                # X_enc is shape (n_samples, n_features)
                decoded_rows = []
                for row in X_enc:
                    decoded = []
                    for feat, val in zip(helper.features_to_keep, row):
                        if feat in self.encoders:
                            le = self.encoders[feat]

                            # Safely inverse-transform if value is in range
                            classes = list(le.classes_)
                            if 0 <= val < len(classes):
                                original_val = classes[val]
                            else:
                                # If it's out of range, return '__unknown__' explicitly
                                original_val = "__unknown__"

                            # Convert numpy scalar to native Python type
                            if hasattr(original_val, "item"):
                                original_val = original_val.item()
                            decoded.append(original_val)
                        else:
                            # Pass numerical or non-encoded feature through unchanged
                            if hasattr(val, "item"):
                                val = val.item()
                            decoded.append(val)
                    decoded_rows.append(decoded)
                return decoded_rows
        
        try:
            with open(NETWORK_ENCODER, "rb") as f:
                encoders = pickle.load(f)
                self.encoder = MixedFeatureEncoder(encoders)
                return None
        except Exception as e:
            error_msg = f"Failed to load encoders from {NETWORK_ENCODER}: {e}"
            print(error_msg)
            self.logger.error(error_msg, exc_info=True)

    def load_network_scaler(self): 
        """
        Adding a min-max scaler for scaling the features.
        """
        try:
            with open(NETWORK_SCALER, "rb") as f:
                self.scaler = pickle.load(f)
        except Exception as e:
            error_msg = f"Failed to load encoders from {NETWORK_SCALER}: {e}"
            print(error_msg)
            self.logger.error(error_msg, exc_info=True)
            return None
    
    def replace_features_to_keep(self, feature_list:list):
        """
        Replaces the features to keep with a new list.
        """
        self.features_to_keep = feature_list




class SensorProbe:
    def __init__(self, sensor_stream=None):
        self.sensor_stream = sensor_stream or Stream(asynchronous=True)
        self._server = None
        self._server_task = None
        self.logger = get_logger("SensorProbe")
        self.encoder = None
        self.scaler = None
        self.features_to_keep = DEFAULT_IMPORTANT_FEATURES
        self.data_counter = 0
        self._lock = threading.Lock()
        self.detect_stream = self.sensor_stream.map(self._parse_sensor_data)
        self.logger.info("SensorProbe initialized.")


    def _parse_sensor_data(self, b: bytes):
        s = b.rstrip(b"\n").decode("utf-8", "replace")
        if not s:
            return None
        try:
            js = json.loads(s)
            sensor_data_list = list(js)
            # print(f"[DEBUG] Parsed sensor data list: {sensor_data_list}")
            with self._lock:
                sensor_data_scaled = self.scaler.transform(np.array(sensor_data_list).reshape(1, -1))
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                log = {'data_count': self.data_counter}
                # sensor_data_package = cSensorData(EDGE_DEVICE_ID, timestamp, sensor_data_list, log) 
                sensor_data_package = cSensorData(EDGE_DEVICE_ID, timestamp, sensor_data_scaled[0].tolist(), log) 
                self.data_counter += 1
                return sensor_data_package.to_json()
        except Exception as e:
            print(f"[JSON ERROR] {e} :: {s[:200]}")
            self.logger.exception(f"[JSON ERROR] {e} :: {s[:200]}")
            return None

    async def create_tcp_server(self, host=TCP_HOST_IP, port=SENSOR_DATA_TCP_PORT):
        async def _handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
            try:
                while True:
                    line = await reader.readline()  # reads until b"\n" or EOF
                    if not line:
                        break
                    # IMPORTANT: in async mode, emit returns an awaitable — await it
                    # print(f"[DEBUG] Received sensor data: {line}")
                    await self.sensor_stream.emit(line)    # backpressure-friendly
            finally:
                try:
                    writer.close()
                    await writer.wait_closed()
                except Exception:
                    pass
        
        server = await asyncio.start_server(_handle_client, host, port)
        # print(f"TCP server listening on {host}:{port}")
        self.logger.info(f"TCP server listening on {host}:{port}")
        
        async with server:
            await server.serve_forever()

    def load_sensor_scaler(self):
        """
        Loads the sensor scaler object from the predefined SENSOR_SCALER.
        """
        try:
            self.scaler = joblib.load(SENSOR_SCALER)
            return None
        except Exception as e:
                self.logger.exception(e)



