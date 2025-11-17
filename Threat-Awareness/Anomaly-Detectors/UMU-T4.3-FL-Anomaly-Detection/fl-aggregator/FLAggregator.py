"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import flwr as fl
from flwr.server.strategy import FedAvg
from CustomDPFedAvg import CustomDPFedAvg

from utils import (
    create_custom_logger,
    parse_config_fl_aggregator
)

from typing import List, Tuple

CONFIG_PATH = 'config/fl_aggregator.conf'

def aggregate_fit_metrics(metrics: List[Tuple[int, dict]]) -> dict:
    """Aggregate fit metrics from all clients."""
    aggregated_metrics = {}
    num_examples_total = sum(num_examples for num_examples, _ in metrics)
    for num_examples, client_metrics in metrics:
        for key, value in client_metrics.items():
            if key not in aggregated_metrics:
                aggregated_metrics[key] = 0.0
            aggregated_metrics[key] += value * num_examples / num_examples_total
    return aggregated_metrics

def aggregate_evaluate_metrics(metrics: List[Tuple[int, dict]]) -> dict:
    """Aggregate evaluate metrics from all clients."""
    aggregated_metrics = {}
    num_examples_total = sum(num_examples for num_examples, _ in metrics)
    for num_examples, client_metrics in metrics:
        for key, value in client_metrics.items():
            if key not in aggregated_metrics:
                aggregated_metrics[key] = 0.0
            aggregated_metrics[key] += value * num_examples / num_examples_total
    return aggregated_metrics

def main():
    # Create custom logger
    logger = create_custom_logger("Federated Learning Aggregator")

    # Read parameters from configuration file
    (
        fl_rounds,
        min_clients,
        mu_protected,
        listening_port
    ) = parse_config_fl_aggregator(CONFIG_PATH, logger)

    # Define the FL strategy
    strategy = FedAvg(
        fraction_fit=1.0,
        min_fit_clients=min_clients,
        min_available_clients=min_clients,
        fit_metrics_aggregation_fn=aggregate_fit_metrics,
        evaluate_metrics_aggregation_fn=aggregate_evaluate_metrics,
    )

    if mu_protected:
        logger.info("GENERAL: Using FedAvg-DP strategy")
        # Modify the strategy to include Differential Privacy
        strategy = CustomDPFedAvg(
            clip_norm=1.0,
            noise_stddev=2,
            fraction_fit=1.0,
            min_fit_clients=min_clients,
            min_available_clients=min_clients,
            fit_metrics_aggregation_fn=aggregate_fit_metrics,
            evaluate_metrics_aggregation_fn=aggregate_evaluate_metrics,
        )
    else:
        logger.info("GENERAL: Using default FedAvg strategy")

    # Start Flower server (blocking call)
    fl.server.start_server(
        server_address=f"0.0.0.0:{listening_port}",
        config=fl.server.ServerConfig(num_rounds=fl_rounds),
        strategy=strategy
    )

if __name__ == '__main__':
    main()

