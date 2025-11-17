# Description

This asset, framed in RESILMESH Task 4.3, is designed and implemented to provide a real-time Federated Learning (FL)-based anomaly and attack classification mechanism from flow traffic features. It incorporates noise adding and model clipping techniques to achieve a differentially private (DP) training, robust against the most relevant threats of a Federated Learning scenario.

It is composed by three main modules, namely:

- **FL Agent**: it loads a predefined dataset, registers against the aggregator, perform the federated training collaboratively with other agents, and provide the local AI-Based Detection engine with the final detection model.
- **FL Aggregator**: it coordinates the FL process, managing the connection of several agents, and aggregating the model updates for each training round. In the last round, it sends the final model to each agent that has participated in the process.
- **AI-Based Detection Engine**: it receives the model from the local FL Agent, tests it against a predefined testing dataset, and starts listening to a NATS subject for incoming traffic flows to be evaluated. For each received flow, it classifies it as normal/benign, or as any of the attack labels learned during the training process. If the prediction falls below a predefined threshold, it assigns an "Unknown" label, indicating the possibility of a zero-day attack taking place. For each flow classified as an attack type or "Unknown" type, an alert is generated and published to a different subject. 

# Requirements

This asset relays on a traffic monitoring and flow processing framework, capable of collecting packets from the network in real time, generating the corresponding traffic flows and calculating several metrics for each one. These metrics are used to either generate the training and testing datasets, and to feed the AI-Based Detection Engine through NATS in inference phase.

Furthermore, initial datasets are provided within the `datasets/` folder inside FL Agent and AI-Based Detection Engine subfolders. These datasets are generated from benign and attack traffic profiles using UMU Monitoring Sensor and Flow Processor. We generated and collected that traffic from our testbed. The attack profile includes the simulation of three kinds of attacks: a DoS attack using the TCP SYN flood technique, a brute-force dictionary-based attack against a HTTP service, and a brute-force dictionary-based attack against a SSH service.

As for software dependencies, since all modules are packed in Docker, there is no other prerequisite to be met than a Docker installation. 

# Configuration

Each module offers a configuration file inside its local folder (in a sub-folder named `config/`). Below, the configurable parameters for each module are described:

- **FL Agent**: for the initial integration, it is recommended to only modify the FL Aggregator and AI-Based Detection Engine URLs, and keep default values for the rest of the parameters.

```json
{
  "fl_agent": {
    # Path to the training dataset.
    "dataset_path": "datasets/training_df.csv",
    # URL (format "IP:port") of the aggregator.
    "aggregator_url": "change_this_ip:change_this_port",
    # URL (format "IP:port") of the AI-Based Detection Engine.
    "detector_url": "change_this_ip:change_this_port",
    # Training local epochs.
    "local_epochs": 5,
    # Training batch size.
    "batch_size": 32,
    # Steps to be executed per local epoch.
    "steps_per_epoch": 1,
    # Percentage of the training dataset that will be used for in-round testing.
    "test_size": 0.33,
    # Noise mechanism to be applied. Supported mechanisms are: "gaussian", "laplacian", "uniform", "exponential" and "salt_and_pepper".
    "noise_mechanism": "gaussian" 
  }
}
```

- **FL Aggregator**: similar to the FL Agent, for an initial integration, it is recommended to only modify the listening port, and keep default values for the rest of the parameters.

```json
{
  "fl_aggregator": {
    # Number of FL rounds to be executed.
    "fl_rounds": 1,
    # Minimum number of registered clients to start the training process.
    "min_clients": 2,
    # Flag to indicate whether model updates are going to be protected (through DP) or not. 0 will disable this functionality, 1 will enable it. When enabled, agents will apply the noise mechanism defined in their local configuration, as well as a predefined model clipping.
    "mu_protected": 0,
    # Listening port used for incoming connections (registrations) from FL Agents. This value is important to adjust the aggregator's URL in the FL Agents' local configurations.
    "listening_port": change_this_ip
  }
}
```

- **AI-Based Detection Engine**: similar to the previous two modules, it is recommended to only modify the listening port and NATS server URL (topics will be created on-demand), leaving the rest of the parameters as default.

```json
{
  "ai_detection_engine": {
    # Listening port used to receive the detection model from the FL Agent 
    "listening_port": change_this_port,
    # Time interval (in seconds) to poll the FL Agent for the model
    "model_polling_interval": 5,
    # Path to the testing dataset
    "testing_data_path": "datasets/testing_df.csv",
    # URL of the NATS server used to receive in real-time the flows information.
    "nats_server_url": "modify_this_ip:4222",
    # Name of the subject where flows information will be published.
    "consumer_subject": "flows-info",
    # Name of the subject where attack flow alerts will be published.
    "producer_subject": "alerts",
    # Confidence threshold to label detected flows as "Unknown"/potential zero-day
    "confidence_threshold": 0.8
  }
}
```

# Build and execution

To build the framework, each component (once configured) has to be built individually. To do so, execute the following (assuming the user is located at the project's root folder):

```bash
cd ai-detection-engine
docker build -t ai-detection-engine .
# Replace "port" with the listening port set in the configuration file, ommiting the brackets.
docker run -p "{port}:{port}" ai-detection-engine 
```

```bash
cd fl-aggregator
docker build -t fl-aggregator .
# Replace "port" with the listening port set in the configuration file, ommiting the brackets.
docker run -p "{port}:{port}" fl-aggregator
```

```bash
cd fl-agent
docker build -t fl-agent .
docker run fl-agent
```

It is recommended to build and launch the modules in the specified order. It is also important to note that at least two FL Agents (or the minimum number specified in the FL Aggregator's configuration file) have to be launched so that the FL process starts.

# License

The provided software license can be found in file ```Resilmesh_License_RCD_140425_PPFL.docx```, placed inside the root folder in this repository.

