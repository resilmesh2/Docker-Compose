"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

from FLClient import FLClient
from utils import (
    create_custom_logger,
    parse_config_fl_agent,
    load_dataset,
    send_model_to_detector
)

CONFIG_PATH = 'config/fl_agent.conf'

def main():
    # Create custom logger
    logger = create_custom_logger("Federated Learning Agent")

    # Read parameters from configuration file (dataset path, aggregator URL, local epochs, batch size, steps per epoch, test size, noise_mechanism)
    (
        dataset_path,
        aggregator_url,
        detector_url,
        local_epochs,
        batch_size,
        steps_per_epoch,
        test_size,
        noise_mechanism
    ) = parse_config_fl_agent(CONFIG_PATH, logger)

    # Load dataset
    data = load_dataset(dataset_path, logger)

    # Create and start the FL client with the parameters (raw dataset, aggregator URL, local epochs, batch size, steps per epoch, test size)
    fl_client = FLClient(
        data,
        aggregator_url,
        local_epochs,
        batch_size,
        steps_per_epoch,
        test_size,
        noise_mechanism,
        logger
    )
    fl_client.start()
    
    # Once done, get the final model along with the scaler and the encoder and send it to the detector through REST method
    final_model = fl_client.get_final_model()
    scaler = fl_client.get_scaler()
    encoder = fl_client.get_encoder()
    feature_names = fl_client.get_feature_names()

    send_model_to_detector(final_model, scaler, encoder, feature_names, detector_url, logger)

if __name__ == '__main__':
    main()
