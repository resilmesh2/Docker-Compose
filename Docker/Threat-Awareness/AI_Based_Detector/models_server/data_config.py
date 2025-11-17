
DEFAULT_ANOMALY = {
    "type": "anomalies",
    "spec_version": "2.1",
    "id": "anomalies--1aa7d222-ccc9-4562-ba47-2b17bf9efd86",
    "created": "2024-04-09T13:41:01.870753Z",
    "modified": "2024-04-09T13:41:01.870753Z",
    "value": 1.45,
    "value_type": "reconstruction_error",
    "flow_id": "1",
    "source_ip": "20.1.249.77",
    "source_port": "61771",
    "destination_ip": "192.168.0.2",
    "destination_port": "80",
    "flow_data": [4.0, 0.0, 4.0, 0.0, 248.0, 248.0, 1672.74, 0.0],
    "label": "anomaly"
}

DEFAULT_MODEL = {
    "type": "model",
    "spec_version": "2.1",
    "id": "model--30772ca8-067b-4f88-a45f-f5b8579c088c",
    "created": "2024-04-09T13:41:01.940615Z",
    "modified": "2024-04-09T13:41:01.940615Z",
    "model_id": "model1",
    "model_name": "MLP",
    "learning_type": "supervised",
    "flow_features": [1000.0, 500.0, 1500.0, 1024.0, 512.0, 1536.0, 20.0, 15.0],
    "threshold": 1.20,
    "binary_class_accuracy": 99.70,
    "multi_class_accuracy": 99.70,
    "framework": "tensorflow",
    "framework_version": "v0.2.1",
    "collection_tool": "nfstream",
    "collection_tool_version": "v0.6.0",
    "training_timestamp": 1921290190290
}

DEFAULT_RELATIONSHIP = {
    "type": "relationship",
    "spec_version": "2.1",
    "id": "relationship--54732f74-09f8-416d-82f6-4e55c47a5367",
    "created": "2024-04-09T13:41:01.963371Z",
    "modified": "2024-04-09T13:41:01.963371Z",
    "relationship_type": "indicates",
    "source_ref": "model--30772ca8-067b-4f88-a45f-f5b8579c088c",
    "target_ref": "anomalies--1aa7d222-ccc9-4562-ba47-2b17bf9efd86"
}

DEFAULT_SENSOR_ANOMALY = {
    "type": "anomalies",
    "id": "anomalies--1aa7d222-ccc9-4562-ba47-2b17bf9efd86",
    "created": "2024-04-09T13:41:01.870753Z",
    "modified": "2024-04-09T13:41:01.870753Z",
    "value": 1.45,
    "value_type": "reconstruction_error",
    "contributing_sensors": {
                            "F_PU1": 0.42,
                            "L_T1": 0.31,
                            "S_PU3": 0.27
                                        },
    "explanation_method": "SHAP",
    "flow_id": ["flow--1aa7d222-ccc9-4562-ba47-2b17bf9efd86", "flow--1aa7d222-ccc9-4562-ba47-2b17bf9efd79"],
    "flow_data": [0.73, 2.27, 4.0, 3.26, 3.87, 5.5, 4.28, 98.93, 1, 98.95, 1, 0.0, 0,
                  33.96, 1, 0, 0, 0.0, 0, 49.78, 1, 33.9, 1, 0, 0, 29.37, 1, 0, 0, 80.81,
                  1, 2.97, 33.54, 26.68, 90.54, 26.74, 84.52, 19.43, 83.27, 19.33,
                  71.33, 29.61, 28.71],
    "feature_sensor_mapping": {
                                "F_PU1": "device_id",
                                "L_T1": "plc_id",
                                "S_PU3": "sensor_id"
                            },
    "label": "sensor_anomaly",
    "severity": "high"
}

SENSOR_THRESHOLD = 0.03

SENSOR_FEATURE_LIST = ["L_T1", "F_PU1", "S_PU1", "F_PU2", "S_PU2", "F_PU3", "S_PU3", "P_J280", "P_J269", 
                      "L_T2", "L_T3", "L_T4", "F_PU6", "S_PU6", "F_PU7", "S_PU7", "P_J289", "P_J415", "F_PU4", "S_PU4", 
	 	            "F_PU5", "S_PU5", "P_J300", "P_J256", "P_J14", "P_J422", "F_V2", "S_V2", "L_T5", "L_T6",  "L_T7", 
                     "F_PU8", "S_PU8", "F_PU9", "S_PU9", "P_J302", "P_J306", "F_PU10", "S_PU10", "F_PU11",
	 	            "S_PU11", "P_J307", "P_J317"]

DEFAULT_SENSOR_MODEL = {
    "type": "model",
    "spec_version": "2.1",
    "id": "model--30772ca8-067b-4f88-a45f-f5b8579c088c",
    "created": "2024-04-09T13:41:01.940615Z",
    "modified": "2024-04-09T13:41:01.940615Z",
    "model_id": "model1",
    "model_name": "MLP",
    "learning_type": "unsupervised",
    "flow_features": SENSOR_FEATURE_LIST,
    "attack_label": "ATT_FLAG",
    "threshold": SENSOR_THRESHOLD,
    "binary_class_accuracy":  92.67,
    "binary_class_balanced_accuracy": 91.16,
    "framework": "PyTorch",
    "framework_version": "2.3.0+cu118",
    "training_timestamp": "2024-10-14 09:07:06,361"
}

NETWORK_THRESHOLD = 0.007855


NETWORK_FEATURE_LIST = ['application_category_name', 'application_confidence',
                'application_is_guessed', 'application_name', 'bidirectional_ack_packets', 'bidirectional_mean_ps',
                'bidirectional_min_piat_ms', 'bidirectional_min_ps', 'bidirectional_rst_packets', 'dst2src_bytes',
                'dst2src_fin_packets', 'dst2src_min_piat_ms', 'dst2src_min_ps', 'dst2src_stddev_piat_ms',
                'dst_oui', 'expiration_id', 'ip_version', 'requested_server_name', 'splt_ps',
                'src2dst_ece_packets', 'src2dst_fin_packets', 'src2dst_max_ps', 'src2dst_mean_piat_ms',
                'src2dst_mean_ps', 'src2dst_min_ps', 'src2dst_psh_packets', 'src2dst_rst_packets', 'src_oui',
                'vlan_id']

DEFAULT_NETWORK_MODEL = {
    "type": "model",
    "spec_version": "2.1",
    "id": "model--30772ca8-067b-4f88-a45f-f5b8579c088c",
    "created": "2024-04-09T13:41:01.940615Z",
    "modified": "2024-04-09T13:41:01.940615Z",
    "model_id": "model1",
    "model_name": "MLP",
    "learning_type": "unsupervised",
    "flow_features": NETWORK_FEATURE_LIST.copy(),
    "attack_label": "Attack_label",
    "threshold": NETWORK_THRESHOLD,
    "binary_class_accuracy": 98.85,
    "binary_class_balanced_accuracy": 95.87,
    "framework": "PyTorch",
    "framework_version": "2.4.0+cu118",
    "training_timestamp": "2024-10-18 09:38:49,944"
}

DEFAULT_NETWORK_ANOMALY = {
    "type": "anomalies",
    "id": "anomalies--1aa7d222-ccc9-4562-ba47-2b17bf9efd86",
    "created": "2024-04-09T13:41:01.870753Z",
    "modified": "2024-04-09T13:41:01.870753Z",
    "value": 1.45,
    "value_type": "reconstruction_error",
    "flow_id": "flow--1aa7d222-ccc9-4562-ba47-2b17bf9efd86",
    "source_ip": "20.1.249.77",
    "source_port": "61771",
    "destination_ip": "192.168.0.2",
    "destination_port": "80",
    "protocol": "TCP", 
    "flow_data": [0, 0, 1, 2, 5, 1, 1, 1, 1, 1, 0.0, 0.0, 55553.0, 63191.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 
                  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 
                  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    "label": "network_anomaly",
    "severity": "high"
}


