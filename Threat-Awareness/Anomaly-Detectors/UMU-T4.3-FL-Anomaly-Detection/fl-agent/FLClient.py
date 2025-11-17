"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from utils import preprocess_data
from model_manager import create_dnn_mcc
import flwr as fl
import numpy as np
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

class FlowerClient(fl.client.NumPyClient):
    def __init__(self, client):
        self.model, self.accuracy_hist, self.x_train, self.x_test, \
        self.y_train, self.y_test, self.epochs, self.batch_size, \
        self.steps_per_epoch, self.noise_mechanism, self.logger = (
            client.model,
            client.accuracy_hist,
            client.x_train,
            client.x_test,
            client.y_train,
            client.y_test,
            client.epochs,
            client.batch_size,
            client.steps_per_epoch,
            client.noise_mechanism,
            client.logger
        )
        self.round_number = 1
        self.rng = np.random.default_rng(1234)

    def get_parameters(self, config):
        return self.model.get_weights()

    def fit(self, parameters, config):
        self.logger.info(
            f"PROCESSING: [ROUND {self.round_number}] Fitting the model on training data..."
        )
        self.model.set_weights(parameters)

        # Train the model and capture the training history
        history = self.model.fit(
            self.x_train,
            self.y_train,
            epochs=self.epochs,
            batch_size=self.batch_size,
            verbose=0,
        )

        self.logger.info("RESULT: Model has been successfully fit for this round")

        # Extract weights
        weights = self.model.get_weights()

        # Apply Differential Privacy (if enabled)
        if "dpfedavg_clip_norm" in config:
            self.logger.info("PROCESSING: Applying clipping to model weights...")
            clip_norm = config["dpfedavg_clip_norm"]
            weights = self.clip_update(weights, clip_norm)
            self.logger.info(
                f"RESULT: Clipping (clip norm = {clip_norm}) has been applied"
            )

        if "dpfedavg_noise_stddev" in config:
            self.logger.info("PROCESSING: Applying noise mechanism to model weights...")
            noise_stddev = config["dpfedavg_noise_stddev"]
            weights = self.add_noise(weights, noise_stddev)
            self.logger.info(
                f"RESULT: Noise mechanism \'{self.noise_mechanism}\' with a noise standard deviation of {noise_stddev} has been applied"
            )

        metrics = {
            "loss": history.history["loss"][-1], 
            "accuracy": history.history["accuracy"][-1],
        }

        return weights, len(self.x_train), metrics
    
    def add_noise(self, weights, noise_stddev):
        noisy_weights = []

        for w in weights:
            if self.noise_mechanism == "gaussian":
                noise = self.rng.normal(loc=0, scale=noise_stddev, size=w.shape)

            elif self.noise_mechanism == "laplacian":
                noise = self.rng.laplace(loc=0, scale=noise_stddev / np.sqrt(2), size=w.shape)

            elif self.noise_mechanism == "uniform":
                noise = self.rng.uniform(
                    low=-np.sqrt(3) * noise_stddev,
                    high=np.sqrt(3) * noise_stddev,
                    size=w.shape
                )

            elif self.noise_mechanism == "exponential":
                noise = self.rng.exponential(scale=noise_stddev, size=w.shape)
                # Flip signs randomly:
                signs = self.rng.choice([-1, 1], size=w.shape)
                noise *= signs

            elif self.noise_mechanism == "salt_and_pepper":
                # salt_and_pepper: prob = noise_stddev is used as the probability
                prob = noise_stddev
                sp = self.rng.choice([0, 1, 2], size=w.shape, p=[1 - prob, prob / 2, prob / 2])
                w = np.where(sp == 1, np.max(w), w)  # 'Salt' => max value
                w = np.where(sp == 2, np.min(w), w)  # 'Pepper' => min value
                noisy_weights.append(w)
                continue

            else:
                raise ValueError(f"Unsupported noise mechanism: {self.noise_mechanism}")

            noisy_weights.append(w + noise)

        return noisy_weights


    def clip_update(self, weights, threshold):
        clipped_weights = [np.clip(w, -threshold, threshold) for w in weights]
        return clipped_weights

    def evaluate(self, parameters, config):
        self.logger.info(
            f"PROCESSING: [ROUND {self.round_number}] Evaluating model for the against testing data...")
        self.model.set_weights(parameters)

        loss, accuracy = self.model.evaluate(self.x_test, self.y_test, verbose=0)

        self.logger.info(
                f"RESULT: Accuracy for the current round is {accuracy}"
        )
        self.round_number += 1       
        metrics = {
            "loss": loss, 
            "accuracy": accuracy,
        }
        return loss, len(self.x_test), metrics


class FLClient:
    def __init__(self,
            data,
            aggregator_url,
            local_epochs,
            batch_size,
            steps_per_epoch,
            test_size,
            noise_mechanism,
            logger
    ):
        self.aggregator_url, self.epochs, self.batch_size, \
        self.steps_per_epoch, self.noise_mechanism, test_size, self.logger = (
            aggregator_url,
            local_epochs,
            batch_size,
            steps_per_epoch,
            noise_mechanism,
            test_size,
            logger
        )
        self.round_number = 1
        self.x_train, self.x_test, self.y_train, self.y_test, self.feature_names, n_classes, self.scaler, self.encoder  = \
            preprocess_data(data, test_size, logger)
        n_features = len(self.feature_names) - 1
        self.model = create_dnn_mcc(n_features, n_classes, logger)
        self.accuracy_hist = []

    def start(self):
        aggregator_ip = str(self.aggregator_url.split(":")[0])
        aggregator_port = int(self.aggregator_url.split(":")[1])
        fl.client.start_client(
            server_address="{aggregator_ip}:{aggregator_port}".format(
                aggregator_ip=aggregator_ip, aggregator_port=aggregator_port
            ),
            client=FlowerClient(self).to_client()
        )

    def get_final_model(self):
        return self.model

    def get_accuracy_hist(self):
        return self.accuracy_hist
    
    def get_scaler(self):
        return self.scaler
    
    def get_encoder(self):
        return self.encoder
    
    def get_feature_names(self):
        return self.feature_names
