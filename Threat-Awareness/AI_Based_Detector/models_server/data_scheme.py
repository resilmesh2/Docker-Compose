
import json
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any
import numpy as np
import pandas as pd
#from data_config import DEFAULT_SENSOR_ANOMALY, DEFAULT_SENSOR_MODEL, DEFAULT_NETWORK_ANOMALY, DEFAULT_NETWORK_MODEL

@dataclass
class cNetworkData:
    device_id: str
    timestamp: str
    features: List[float] = field(default_factory=list)
    log: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> bytes:
        """
        Serialize the data class instance into a UTF-8 encoded JSON string.
        
        :return: A byte string of JSON representation of the instance, UTF-8 encoded
        """
        return json.dumps(asdict(self)).encode('utf-8')
    def to_dict(self):
        """
        Return a dictionary representation of the data class instance.
        """
        return asdict(self)


@dataclass
class cSensorData:
    device_id: str
    timestamp: str
    features: List[float] = field(default_factory=list)
    log: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> bytes:
        """
        Serialize the data class instance into a UTF-8 encoded JSON string.
        
        :return: A byte string of JSON representation of the instance, UTF-8 encoded
        """
        return json.dumps(asdict(self)).encode('utf-8')
    
    def to_dict(self):
        """
        Return a dictionary representation of the data class instance.
        """
        return asdict(self)


@dataclass
class cNetworkResult:
    device_id: str
    timestamp: str
    type: str
    anomaly: int
    features: List[float] = field(default_factory=list)
    log: Dict[str, Any] = field(default_factory=dict)
    def to_json(self) -> bytes:
        """
        Serialize the data class instance into a UTF-8 encoded JSON string.
        
        :return: A byte string of JSON representation of the instance, UTF-8 encoded
        """
        return json.dumps(asdict(self)).encode('utf-8')

@dataclass
class cSensorResult:
    device_id: str
    timestamp: str
    _type: str
    anomaly: float
    features: List[float] = field(default_factory=list)
    log: Dict[str, Any] = field(default_factory=dict)
    def to_json(self) -> bytes:
        """
        Serialize the data class instance into a UTF-8 encoded JSON string.
        
        :return: A byte string of JSON representation of the instance, UTF-8 encoded
        """
        return json.dumps(asdict(self)).encode('utf-8')
    def to_dict(self):
        """
        Return a dictionary representation of the data class instance.
        """
        return asdict(self)
    
class ReplayBuffer:
    def __init__(self, capacity=10):
        self.capacity = capacity
        self.buffer = []
        self.position = 0

    def append(self, data):
        if len(self.buffer) < self.capacity:
            self.buffer.append(data)
        else:
            self.buffer[self.position] = data
        self.position = (self.position + 1) % self.capacity

    def get_buffer(self):
        return self.buffer

@dataclass
class NetworkAnomalies:
    type: str
    id: str
    created: str
    modified: str
    value: float
    value_type: str
    flow_id: str
    source_ip: str
    source_port: str
    destination_ip: str
    destination_port: str
    protocol: str
    flow_data: List[float]
    label: str
    severity: str

@dataclass
class SensorAnomalies:
    type: str
    id: str
    created: str
    modified: str
    value: float
    value_type: str
    flow_id: List[str]
    flow_data: List[float]
    explanation_method: str
    contributing_sensors: Dict[str, float]
    feature_sensor_mapping: Dict[str, str]
    label: str
    severity: str

@dataclass
class NetworkModel:
    type: str
    spec_version: str
    id: str
    created: str
    modified: str
    model_id: str
    model_name: str
    learning_type: str
    flow_features: List[str]  # List of feature names as strings
    attack_label: str
    threshold: float
    binary_class_accuracy: float
    binary_class_balanced_accuracy: float
    framework: str
    framework_version: str
    training_timestamp: str  # Keeping as a string for date formattin

@dataclass
class SensorModel:
    type: str
    spec_version: str
    id: str
    created: str
    modified: str
    model_id: str
    model_name: str
    learning_type: str
    flow_features: List[str]  # List of feature names as strings
    attack_label: str
    threshold: float
    binary_class_accuracy: float
    binary_class_balanced_accuracy: float
    framework: str
    framework_version: str
    training_timestamp: str  # Integer timestamp

@dataclass
class Relationship:
    type: str
    spec_version: str
    id: str
    created: str
    modified: str
    relationship_type: str
    source_ref: str
    target_ref: str

@dataclass
class NetworkBundle:
    type: str
    id: str
    objects: List[Any] = field(default_factory=list)

    def get_objects(self, index, obj_name):
        if index < len(self.objects):
            obj = self.objects[index]
            if hasattr(obj, obj_name):  # Check if the object has the requested attribute
                return getattr(obj, obj_name)  # Dynamically get the attribute
            else:
                raise AttributeError(f"Object does not have an attribute named '{obj_name}'")
        else:
            raise IndexError("Invalid object index")
        
    def set_objects(self, index, obj_name, value):
        if index < len(self.objects):
            obj = self.objects[index]
            if hasattr(obj, obj_name):
                setattr(obj, obj_name, value)  # Dynamically set the attribute
            else:
                raise AttributeError(f"Object does not have an attribute named '{obj_name}'")
        else:
            raise IndexError("Invalid object index")
    
    def to_json(self) -> bytes:
            """
            Serialize the data class instance into a UTF-8 encoded JSON string.
            
            :return: A byte string of JSON representation of the instance, UTF-8 encoded
            """
            def serialize_object(obj):
                # Check if the object is a dataclass, otherwise return its dictionary representation
                if hasattr(obj, "__dataclass_fields__"):
                    return asdict(obj)
                elif isinstance(obj, dict):
                    return obj  # It's already a dictionary
                else:
                    raise TypeError(f"Object of type {type(obj).__name__} is not serializable")
            serialized_bundle  = dict()
            # Serialize the objects list by ensuring each item is properly converted
            serialized_objects = [serialize_object(obj) for obj in self.objects]
            
            serialized_bundle["id"] = self.id
            serialized_bundle["type"] = self.type
            serialized_bundle["objects"] = serialized_objects
            
            return json.dumps(serialized_bundle, indent=4).encode('utf-8')

@dataclass
class SensorBundle:
    type: str
    id: str
    objects: List[Any] = field(default_factory=list)

    def get_objects(self, index, obj_name):
        if index < len(self.objects):
            obj = self.objects[index]
            if hasattr(obj, obj_name):  # Check if the object has the requested attribute
                return getattr(obj, obj_name)  # Dynamically get the attribute
            else:
                raise AttributeError(f"Object does not have an attribute named '{obj_name}'")
        else:
            raise IndexError("Invalid object index")
        
    def set_objects(self, index, obj_name, value):
        if index < len(self.objects):
            obj = self.objects[index]
            if hasattr(obj, obj_name):
                setattr(obj, obj_name, value)  # Dynamically set the attribute
            else:
                raise AttributeError(f"Object does not have an attribute named '{obj_name}'")
        else:
            raise IndexError("Invalid object index")
    
    def to_json(self) -> bytes:
            """
            Serialize the data class instance into a UTF-8 encoded JSON string.
            
            :return: A byte string of JSON representation of the instance, UTF-8 encoded
            """
            def serialize_object(obj):
                # Check if the object is a dataclass, otherwise return its dictionary representation
                if hasattr(obj, "__dataclass_fields__"):
                    return asdict(obj)
                elif isinstance(obj, dict):
                    return obj  # It's already a dictionary
                else:
                    raise TypeError(f"Object of type {type(obj).__name__} is not serializable")
            serialized_bundle  = dict()
            # Serialize the objects list by ensuring each item is properly converted
            serialized_objects = [serialize_object(obj) for obj in self.objects]
            
            serialized_bundle["id"] = self.id
            serialized_bundle["type"] = self.type
            serialized_bundle["objects"] = serialized_objects
            
            return json.dumps(serialized_bundle, indent=4).encode('utf-8')




if __name__ == '__main__':



    
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
         "binary_class_balanced_accuracy": 99.70,
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

    oNetBundle = NetworkBundle(
                                                type="bundle",
                                                id="bundle--cd2a2cf9-18f3-480a-aaa5-c4b59ce6910b",
                                                objects=[
                                                    NetworkAnomalies(**DEFAULT_NETWORK_ANOMALY
                                                        
                                                    ),
                                                    NetworkModel(**DEFAULT_NETWORK_MODEL
                                                        
                                                    )
                                                ]
                                            )
    print(oNetBundle.set_objects(0, "label", "anomaly"))

    

    json_object = oNetBundle.to_json()
    print(json_object)

        # Writing to sample.json
    with open("sample.json", "w") as outfile:
        outfile.write(json_object.decode('utf-8'))


    buffer = ReplayBuffer()

    buffer.append([0,0,1])
    #print(buffer.get_buffer())