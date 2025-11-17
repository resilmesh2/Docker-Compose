"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import base64
import joblib
import io
from keras.models import model_from_json

def load_model_from_data(model_json, model_weights_base64):
    # Deserialize model from JSON
    model = model_from_json(model_json)
    # Decode weights from base64 and load into model
    model_weights = base64.b64decode(model_weights_base64.encode('utf-8'))
    with open("model_temp.weights.h5", "wb") as f:
        f.write(model_weights)
    model.load_weights("model_temp.weights.h5")
    return model

def load_scaler_from_data(scaler_base64):
    # Decode base64 to bytes
    scaler_data = base64.b64decode(scaler_base64.encode("utf-8"))
    
    # Deserialize scaler from a memory buffer
    buffer = io.BytesIO(scaler_data)
    scaler = joblib.load(buffer)
    return scaler

def load_encoder_from_data(encoder_base64):
    # Decode base64 to bytes
    encoder_data = base64.b64decode(encoder_base64.encode("utf-8"))
    
    # Deserialize encoder from a memory buffer
    buffer = io.BytesIO(encoder_data)
    encoder = joblib.load(buffer)
    return encoder