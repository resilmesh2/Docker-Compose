import os
import asyncio
import warnings

from streamz import Stream
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from data_generation.generate import GenEdgeData
from edge_detection.detect import cEdgeDetector
from network_capturing.probe import NetworkProbe, SensorProbe
from models_server.data_config import NETWORK_FEATURE_LIST, NETWORK_THRESHOLD, SENSOR_THRESHOLD
from logging_setup import get_logger

from sklearn.exceptions import InconsistentVersionWarning

# Suppress specific warnings
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
warnings.filterwarnings("ignore", category=UserWarning, message="X does not have valid feature names")

# Load environment variables from .env file in the script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")
load_dotenv(env_path)

EDGE_DEVICE_ID         = os.getenv("EDGE_DEVICE_ID")
LOG_PATH               = os.getenv("LOG_PATH")
EDGE_DETECTOR          = os.getenv("EDGE_DETECTOR")
NETWORK_FILE           = os.getenv("NETWORK_FILE")
SENSOR_FILE            = os.getenv("SENSOR_FILE")
TCP_HOST_IP            = os.getenv("TCP_HOST_IP")
NETWORK_DATA_TCP_PORT  = os.getenv("NETWORK_DATA_TCP_PORT")
SENSOR_DATA_TCP_PORT   = os.getenv("SENSOR_DATA_TCP_PORT")


#Constants defining if whole data is send to the central server and the threshold for detection anomalies
bSendNetworkFeatures = True 
fNetworkThreshold = NETWORK_THRESHOLD
bSendSensorFeatures = True
fSensorThreshold = SENSOR_THRESHOLD

logger = get_logger("Main")


def main():
    # -----------------------------
    # 1) Setup Streams and MQTT client
    # -----------------------------
    # print("[DEBUG] Initializing NetworkStream and SensorStream...")
    logger.debug("Initializing NetworkStream and SensorStream...")
    NetworkStream = Stream(asynchronous=True)
    SensorStream = Stream(asynchronous=True)
    oMQQTClient = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    # -----------------------------
    # 2) Initialize data generator
    # -----------------------------
    # print("[DEBUG] Initializing data generator...")
    # logger.debug("Initializing data generator...")
    # oDataGenerator = GenEdgeData(NetworkStream, SensorStream)
    # oDataGenerator.read_network_csv(NETWORK_FILE)
    # oDataGenerator.read_sensor_csv(SENSOR_FILE)

    # -----------------------------
    # 3) Initialize network and sensor probe
    # -----------------------------
    # print("[DEBUG] Init/Setup of network and sensor probe...")
    logger.debug("Init/Setup of network and sensor probe...")
    network_probe = NetworkProbe(NetworkStream)
    sensor_probe = SensorProbe(SensorStream)
    network_probe.load_network_encoder()
    network_probe.load_network_scaler()
    network_probe.replace_features_to_keep(NETWORK_FEATURE_LIST.copy())
    sensor_probe.load_sensor_scaler()

    # -----------------------------
    # 4) Setup Edge Detector
    # ---------------------------
    # print("[DEBUG] Initializing edge detector...")
    logger.debug("Initializing edge detector...")
    oEdgeDetctor = cEdgeDetector(NetworkStream, SensorStream, oMQQTClient)
    # Load your ML models/scalers
    oEdgeDetctor.load_sensor_state_dict()
    # oEdgeDetctor.load_sensor_scaler()
    oEdgeDetctor.load_network_state_dict()
    # Further setup of streams
    oEdgeDetctor.setup_network_stream(network_probe, fNetworkThreshold, bSendNetworkFeatures)
    oEdgeDetctor.setup_sensor_stream(sensor_probe, fSensorThreshold, bSendSensorFeatures)

    # -----------------------------
    # 5) Definition of async tasks
    # -----------------------------
    async def run_data_capturing():
        logger.debug(f"Starting network traffic capture on port {NETWORK_DATA_TCP_PORT}...")
        network_task = network_probe.create_tcp_server(TCP_HOST_IP, NETWORK_DATA_TCP_PORT)
        # network_task = oDataGenerator.emit_network_data()
        logger.debug(f"Starting sensor traffic capture on port {SENSOR_DATA_TCP_PORT}...")
        sensor_task = sensor_probe.create_tcp_server(TCP_HOST_IP, SENSOR_DATA_TCP_PORT)
        # sensor_task = oDataGenerator.emit_sensor_data()
        await asyncio.gather(network_task, sensor_task)

    try:
        asyncio.run(run_data_capturing()) 
        print("Async main finished.") #? this will never be reached
    except KeyboardInterrupt:
        logger.error("KeyboardInterrupt detected. Exiting async main.")
        return


if __name__ == '__main__':
    main()


