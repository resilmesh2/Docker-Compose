import os
import asyncio
import logging
from datetime import datetime

import pandas as pd
from streamz import Stream
from dotenv import load_dotenv

from models_server.data_scheme import cNetworkData, cSensorData
from models_server.BATADAL_dataset import load_BATADAL_Dataset
from models_server.data_config import DEFAULT_SENSOR_MODEL, DEFAULT_NETWORK_MODEL
from logging_setup import get_logger

# Load environment variables from .env file in the main script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, "..", ".env")
load_dotenv(env_path)

EDGE_DEVICE_ID = os.getenv("EDGE_DEVICE_ID")
LOG_PATH = os.getenv("LOG_PATH")
EDGE_DETECTOR = os.getenv("EDGE_DETECTOR")
NETWORK_FILE = os.getenv("NETWORK_FILE")
SENSOR_FILE = os.getenv("SENSOR_FILE")

# class CustomLogger:
#     def __init__(self, log_path, log_level=logging.DEBUG):
#         self.logger = logging.getLogger()
#         self.logger.setLevel(log_level)
#         formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
#         file_handler = logging.FileHandler(log_path)
#         file_handler.setLevel(log_level)
#         file_handler.setFormatter(formatter)
#         self.logger.addHandler(file_handler)

#     def exception(self, error):
#         self.logger.exception(f"debug mode: {error}")
#         return None

class GenEdgeData:
    def __init__(self, NetworkStream: Stream, SensorStream: Stream):
        """Initialize with a Streamz Stream object."""
        self.NetworkStream = NetworkStream
        self.SensorStream = SensorStream
        self.dSensorDataFrame = None #pd.DataFrame()
        self.dNetworkDataFrame = None #pd.DataFrame()
        self.network_index = 0 
        self.sensor_index = 0
        self.sensor_counter = 0
        self.logger = get_logger("GenEdgeData")
        self.initial_timestamp = datetime.now()

        
    def read_network_csv(self, file_path: str):
        """Reads in the CSV file and stores it in a pandas DataFrame."""
        
        try:
            feature_list = DEFAULT_NETWORK_MODEL['flow_features'].copy()  
            feature_list.append(DEFAULT_NETWORK_MODEL['attack_label'])#
            dummydf  = pd.read_csv(file_path)
            self.dNetworkDataFrame = dummydf[feature_list]
            
        except FileNotFoundError as fe:
            self.logger.exception(f"{fe}: no file found at {file_path}")
            #raise FileNotFoundError(f"The file at {file_path} does not exist.")
        except Exception as e:
            self.logger.exception("A {e} occured.")
            #raise Exception(f"An unexpected error occurred: {e}")

    def read_sensor_csv(self, file_path: str):
        """Reads in the CSV file and stores it in a pandas DataFrame."""
        
        try:
            feature_list = DEFAULT_SENSOR_MODEL['flow_features'].copy() 
            feature_list.append(DEFAULT_SENSOR_MODEL['attack_label'])
            
            dummydf = pd.read_csv(file_path)
            
            self.dSensorDataFrame= dummydf[feature_list]
        except FileNotFoundError as fe:
            self.logger.exception(f"{fe}: no file found at {file_path}")
            #raise FileNotFoundError(f"The file at {file_path} does not exist.")
        except Exception as e:
            self.logger.exception("A {e} occured.")
            #raise Exception(f"An unexpected error occurred: {e}")
    
    def df_from_BADATAL(self,):
        xTest, yTest, lineIndexTest, fileIndexTest, attackIndexListTest, xTrain, yTrain, \
        lineIndexTrain, fileIndexTrain, attackIndexListTrain, \
        scaler, scaleFunction, dataFileNameList = load_BATADAL_Dataset()
        #print(xTest)
        self.dSensorDataFrame = pd.DataFrame(xTest)
        self.dSensorDataFrame['label'] = yTest
        
        return None
        
    async def generate_network_data(self):
        """Yield Data instances from the DataFrame."""
        done = False
        while not done: 
            try:
                if self.dNetworkDataFrame is None:
                    raise ValueError("Data frame is not set. Please set the data_frame before generating data.")
                elif self.dNetworkDataFrame.empty:
                    raise ValueError("The data frame is empty. No data to generate.")
                elif self.network_index >= len(self.dNetworkDataFrame):
                    print("No more data to generate.")
                    done = True
                    # or you could reset the counter if you want to loop through the data again
                else:
                    # Get the row at the current index
                    row = self.dNetworkDataFrame.iloc[self.network_index]
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                    features = [float(item) for item in row.tolist()[:-1]]
                    label= row.to_list()[-1]
                    log = {'attack_label': label}
                    self.network_index += 1  # Increment the counter
                    yield cNetworkData(EDGE_DEVICE_ID, timestamp, features, log)
                    await asyncio.sleep(1)
            except Exception as e:
                self.logger.exception("A {e} occured.")

    async def emit_network_data(self):
        """Emit data to the Stream."""
        try:
            async for data in self.generate_network_data():
                self.NetworkStream.emit(data.to_json())
                #self.logger.info(f"Emitting Network data: {data.to_json()}")
        except Exception as e:
            self.logger.exception("A {e} occured.")
            #print(f"An error occurred while emitting data: {e}")

    async def generate_sensor_data(self):
        """Yield Data instances from the SensorDataFrame."""
        done = False
        while not done: 
            try:
                log = dict()
                current_time = datetime.now()

                if self.dSensorDataFrame is None:
                    raise ValueError("Data frame is not set. Please set the data_frame before generating data.")
                elif self.dSensorDataFrame.empty:
                    raise ValueError("The data frame is empty. No data to generate.")
                elif self.sensor_index >= len(self.dSensorDataFrame):
                    print("No more data to generate.")
                    done = True
                    # or you could reset the counter if you want to loop through the data again
                else:
                    row = self.dSensorDataFrame.iloc[self.sensor_index]
                    timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S.%f")
                    features = [float(item) for item in row.tolist()[:-1]]
                    # print(f"features: {features}")
                    label= row.to_list()[-1]
                    log = {'attack_label': label}
                    self.sensor_index += 1  # Increment the counter
                    yield cSensorData(EDGE_DEVICE_ID, timestamp, features, log)
                await asyncio.sleep(5) #60
                # await asyncio.sleep(1) #60
            except Exception as e:
                self.logger.exception("A {e} occured.")


    # async def generate_sensor_data_hb(self):
    #     """Yield Data instances from the SensorDataFrame."""
    #     done = False
    #     log = dict()
    #     while not done: 
    #         try:
    #             current_time = datetime.now()
    #             delta = current_time - self.initial_timestamp
    #             if (delta.seconds % 2 == 0): #60
    #                 if self.dSensorDataFrame is None:
    #                     raise ValueError("Data frame is not set. Please set the data_frame before generating data.")
    #                 elif self.dSensorDataFrame.empty:
    #                     raise ValueError("The data frame is empty. No data to generate.")
    #                 elif self.sensor_index >= len(self.dSensorDataFrame):
    #                     print("No more data to generate.")
    #                     done = True
    #                     # or you could reset the counter if you want to loop through the data again
    #                 else:
    #                     row = self.dSensorDataFrame.iloc[self.sensor_index]
    #                     timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S.%f")
    #                     features = [float(item) for item in row.tolist()[:-1]]
    #                     label= row.to_list()[-1]
    #                     log = {'attack_label': label}
    #                     self.sensor_index += 1  # Increment the counter
    #                     yield cSensorData(EDGE_DEVICE_ID, timestamp, features, log)
    #             else: 
    #                 timestamp = current_time.strftime("%Y-%m-%d %H:%M:%S")
    #                 features = []
    #                 log['log'] = f'sensor data heartbeat, device: {EDGE_DEVICE_ID}'
    #                 #log['label'] = -1
    #                 yield cSensorData(EDGE_DEVICE_ID, timestamp, features, log)
    #             await asyncio.sleep(1) #60
    #         except Exception as e:
    #             self.logger.exception("A {e} occured.")

    async def emit_sensor_data(self):
        """Emit data to the Stream."""
        # print("[DEBUG] Starting to emit sensor data...")
        from datetime import datetime
        try:
            async for data in self.generate_sensor_data():
                self.SensorStream.emit(data.to_json())
                # print(f"{datetime.now().strftime('%H:%M:%S')} - Emitting Sensor data: {data.to_json()}")

        except Exception as e:
            self.logger.exception(f"A {e} occured.")
            #print(f"An error occurred while emitting data: {e}")

#if __name__ == "__main__":

    
    