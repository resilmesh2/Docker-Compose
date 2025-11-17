"""
Authors:
- Pablo Fernández Saura (pablofs@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Jorge Bernal Bernabé (jorgebernal@um.es), Dept. of Information and Communications Engineering, University of Murcia
- Antonio Skarmeta (skarmeta@um.es), Dept. of Information and Communications Engineering, University of Murcia
""" 

import base64
import joblib
import io

from keras.layers import Dense
from keras.optimizers import Adam
from keras.models import Sequential
from keras.models import model_from_json

def create_dnn_mcc(n_features, n_classes, logger):
    logger.info('PROCESSING: Creating DNN model for MCC...')
    model = Sequential([
        Dense(64, input_shape=(n_features,), activation='relu'),
        Dense(64, activation='relu'),
        Dense(n_classes, activation='softmax')
    ])
    model.compile(
        optimizer=Adam(),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    logger.info('RESULT: DNN model for MCC has been created and compiled successfully')

    return model

def save_model_to_data(model):
    # Serialize model to JSON
    model_json = model.to_json()
    # Serialize weights to HDF5 and encode to base64
    model.save_weights("model.weights.h5")
    with open("model.weights.h5", "rb") as f:
        model_weights = base64.b64encode(f.read()).decode('utf-8')
    return model_json, model_weights

def save_scaler_to_data(scaler):
    # Serialize scaler to a memory buffer
    buffer = io.BytesIO()
    joblib.dump(scaler, buffer)
    buffer.seek(0)
    
    # Encode the buffer's content to base64
    scaler_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    return scaler_base64

def save_encoder_to_data(encoder):
    # Serialize encoder to a memory buffer
    buffer = io.BytesIO()
    joblib.dump(encoder, buffer)
    buffer.seek(0)
    
    # Encode the buffer's content to base64
    encoder_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    return encoder_base64
