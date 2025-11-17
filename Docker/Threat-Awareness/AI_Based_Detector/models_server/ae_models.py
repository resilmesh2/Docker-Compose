import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

############################################## CONSTANT DEFINITIONS ##################################################
TRAIN = False
FILENAME_MODEL = "AE_model_TRAIN_True_ADV_TRAIN_True_EPS_TRAIN_0.05_ALPHA_TRAIN_0.005_NUM_ITER_TRAIN_10_GEN_ADV_SAMPLES_True_EPS_SAMPLES_1000_ALPHA_SAMPLES_0_NUM_ITER_SAMPLES_100000_NUM_FEAT_USED_51.pth"
FILENAME_L2 = 'l2_norm_TRAIN_True_ADV_TRAIN_False_GEN_ADV_SAMPLES_True_EPS_SAMPLES_1000_ALPHA_SAMPLES_0_NUM_ITER_SAMPLES_100000_NUM_FEAT_USED_51 (2).npy'
ADV_TRAIN = True
EPS_TRAIN = 0.5
ALPHA_TRAIN = 0.05
NUM_ITER_TRAIN = 10
LAMBDA_TRAIN_LOSS = 0.1 #seems to be the best option 
FEATURE_WEIGHING_REC = False
MOVING_AVG_REC_ERROR = 14

GEN_ADV_SAMPLES = False
EPS_SAMPLES = 1000
ALPHA_SAMPLES = 0   #if 0, use dynamic alpha ()
NUM_ITER_SAMPLES = 100000

NUM_FEATURES_USED = 51

PLOT_REC_ERROR = True
PLOT_L2_NORM = True

class AutoEncoder(nn.Module):
    def __init__(self):
        super(AutoEncoder, self).__init__()
        
        # Encoder layers
        self.encoder = nn.Sequential(
            nn.Linear(51, 51), 
            nn.Tanh(),
            nn.Linear(51, 51),
            nn.Tanh(),
            nn.Linear(51, 51),
            nn.Tanh(),
            nn.Linear(51, 18)  # Encoding layer with output size 18
        )
        
        # Decoder layers
        self.decoder = nn.Sequential(
            nn.Linear(18, 51),
            nn.Tanh(),
            nn.Linear(51, 51),
            nn.Tanh(),
            nn.Linear(51, 51),
            nn.Tanh(),
            nn.Linear(51, 51)
        )

    def latent(self, x):
        x = self.encoder(x)
        return x

    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x
    
    def reconstructionError(self, x):
        if FEATURE_WEIGHING_REC:
            with torch.no_grad():
                x_tensor = torch.tensor(x, dtype=torch.float32)  # Convert to PyTorch tensor
                x_tensor = x_tensor.unsqueeze(0)  # Add batch dimension
                # Forward pass
                output = self.forward(x_tensor)
                # Calculate loss (MSE)
                J = F.mse_loss(output, x_tensor).item() / 51
                partial_rec_error = 0.0
                for i in range(len(x)):
                    partial_rec_error += F.mse_loss(output.squeeze(0)[i], x_tensor.squeeze(0)[i]).item() / (0.0001 + J)
                #   print("Rec_error: ", partial_rec_error)
                return partial_rec_error
        else:  
            with torch.no_grad():
                x_tensor = torch.tensor(x, dtype=torch.float32, device=device)  # Convert to PyTorch tensor, to devic?
                x_tensor = x_tensor.unsqueeze(0)  # Add batch dimension
                # Forward pass
                output = self.forward(x_tensor)
                # Calculate loss (MSE)
                loss = F.mse_loss(output, x_tensor)
                return loss.item()
            
    
    def inference(self, x, threshold=70.0):
        recError = self.reconstructionError(x)
        if (recError > threshold):
            return 1, recError
        return 0, recError


class NetworkAutoEncoder(nn.Module):
    def __init__(self):
        neuron_count = 29 # this should be the number of features in FEATURE_LIST
        super(NetworkAutoEncoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(neuron_count, neuron_count), 
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, 15)  
        )
        # Decoder layers
        self.decoder = nn.Sequential(
            nn.Linear(15, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
        )

    def latent(self, x):
        x = self.encoder(x)
        return x

    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x
    
    def reconstructionError(self, x):
        self.eval()
        with torch.no_grad():
            # output = self.forward(x)
            output = self(x)
            loss = F.mse_loss(output, x)
        return loss.item() 
    
    
    def inference(self, x, threshold=0.007855):
        recError = self.reconstructionError(x)
        if (recError > threshold):
            return 1, recError
        return 0, recError
# neuron_count_net = 45
# class NetworkAutoEncoder(nn.Module):
#     def __init__(self):
#         super(NetworkAutoEncoder, self).__init__()
        
#         # Encoder layers
#         self.encoder = nn.Sequential(
#             nn.Linear(neuron_count_net, neuron_count_net), 
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net), 
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net),
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net),
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, int(neuron_count_net / 2))  
#         )
        
#         # Decoder layers
#         self.decoder = nn.Sequential(
#             nn.Linear(int(neuron_count_net / 2), neuron_count_net),
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net), 
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net),
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net),
#             nn.Tanh(),
#             nn.Linear(neuron_count_net, neuron_count_net),
#         )

#     def latent(self, x):
#         x = self.encoder(x)
#         return x

#     def forward(self, x):
#         x = self.encoder(x)
#         x = self.decoder(x)
#         return x
    
#     def reconstructionError(self, x):
#         with torch.no_grad():
#             x_tensor = x.clone().detach().requires_grad_(True) # Convert to PyTorch tensor, to devic?
#             x_tensor = x_tensor.unsqueeze(0)  # Add batch dimension
#             # Forward pass
#             output = self.forward(x_tensor)
#             # Calculate loss (MSE)
#             loss = F.mse_loss(output, x_tensor)
#             return loss.item()

#     def inference(self, x, threshold=70.0):
#         recError = self.reconstructionError(x)
#         if (recError > threshold):
#             return 1, recError
#         return 0, recError


neuron_count = 43

class SensorAutoEncoder(nn.Module):
    def __init__(self):
        super(SensorAutoEncoder, self).__init__()
        
  # Encoder layers
        self.encoder = nn.Sequential(
            nn.Linear(neuron_count, neuron_count), 
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, int(neuron_count / 2))  
        )
        
        # Decoder layers
        self.decoder = nn.Sequential(
            nn.Linear(int(neuron_count / 2), neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count),
            nn.Tanh(),
            nn.Linear(neuron_count, neuron_count)
        )
        
    def latent(self, x):
        x = self.encoder(x)
        return x

    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x
    
    def reconstructionError(self, x):
        with torch.no_grad():
            x_tensor = x.clone().detach().requires_grad_(True) # Convert to PyTorch tensor, to devic?
            x_tensor = x_tensor.unsqueeze(0)  # Add batch dimension
            # Forward pass
            output = self.forward(x_tensor)
            # Calculate loss (MSE)
            loss = F.mse_loss(output, x_tensor)
            return loss.item()
    
    def inference(self, x, threshold=70.0):
        recError = self.reconstructionError(x)
        if (recError > threshold):
            return 1, recError
        return 0, recError


class Autoencoder2(nn.Module):
    def __init__(self):
        super(Autoencoder2, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(10, 5),
            nn.ReLU(),
            nn.Linear(5, 2)
        )
        self.decoder = nn.Sequential(
            nn.Linear(2, 5),
            nn.ReLU(),
            nn.Linear(5, 10),
            nn.Sigmoid()  # Using Sigmoid to ensure output values between 0 and 1
        )
    
    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x


class LSTMAutoencoderVAE(nn.Module):
    def __init__(self, input_dim, latent_dim, hidden_lstm, hidden_vae, num_layers, device):
        super(LSTMAutoencoderVAE, self).__init__()
        self.lstm_encoder = nn.LSTM(input_dim, hidden_lstm, num_layers, batch_first=True)
        self.vae = VAE(hidden_lstm ,hidden_vae, latent_dim, device)
        self.lstm_decoder = nn.LSTM(hidden_lstm, input_dim, num_layers, batch_first=True)

    def forward(self, x):
        _, (h_n, _) = self.lstm_encoder(x)
        # output_vae, mu, logvar = self.vae(h_n[-1])
        # # Expand the decoded output for LSTM input requirements (batch, seq_len, features)
        # input_lstm = output_vae.unsqueeze(1).repeat(1, x.size(1), 1) #output_vae.repeat(1, x.size(1), 1)
       
        vae_outputs = []
        for _ in range(x.size(1)):
            output_vae, mu, logvar = self.vae(h_n[-1])  # Generate output from VAE
            vae_outputs.append(output_vae.unsqueeze(1))  # Unsqueeze to add time dimension

        # Concatenate all VAE outputs along the time dimension
        input_lstm = torch.cat(vae_outputs, dim=1)
        # Decode through LSTM
        output_lstm, _ = self.lstm_decoder(input_lstm)
        return output_lstm, mu, logvar

    def reconstructionError(self, x):
        output, _, _ = self.forward(x)
        if FEATURE_WEIGHING_REC:
            with torch.no_grad():
                # Calculate loss (MSE)
                partial_rec_error = 0.0
                partial_rec_error += F.mse_loss(output, x, reduction='sum').item() / (0.0001 + J)
                #   print("Rec_error: ", partial_rec_error)
                return partial_rec_error
        else:  
            with torch.no_grad():
                # Calculate loss (MSE)
                loss = F.mse_loss(output, x, reduction='mean').item() 
                return loss

class VAE(nn.Module):
    def __init__(self, input_dim, hidden_dim, latent_dim, device):
        super(VAE, self).__init__()
        self.device = device
        # encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim, latent_dim),
            nn.LeakyReLU(0.2)
            )
        
        # latent mean and variance 
        self.mean_layer = nn.Linear(latent_dim, 2)
        self.logvar_layer = nn.Linear(latent_dim, 2)
        
        # decoder
        self.decoder = nn.Sequential(
            nn.Linear(2, latent_dim),
            nn.LeakyReLU(0.2),
            nn.Linear(latent_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim, input_dim),
            nn.ReLU()
            )
     
    def encode(self, x):
        x = self.encoder(x)
        mean, logvar = self.mean_layer(x), self.logvar_layer(x)
        return mean, logvar

    def reparameterization(self, mean, var):
        epsilon = torch.randn_like(var).to(self.device)      
        z = mean + var*epsilon
        return z

    def decode(self, x):
        return self.decoder(x)

    def forward(self, x):
        mean, logvar = self.encode(x)
        z = self.reparameterization(mean, logvar)
        x_hat = self.decode(z)
        return x_hat, mean, logvar


class AttentionLSTMVAE(nn.Module):
    def __init__(self, input_dim, seq_len, latent_dim, hidden_lstm, hidden_vae, num_layers, device, mask):
        super(AttentionLSTMVAE, self).__init__()
        self.device = device
        # Define a mask based on physical connections
        # Example mask: To be defined based on your specific needs
        self.masked_attention = FeatureAttention(seq_len, mask=mask.to(device))
        self.lstm_encoder = nn.LSTM(input_dim, hidden_lstm, num_layers, batch_first=True)
        self.vae = VAE(hidden_lstm, hidden_vae, latent_dim, device)
        self.lstm_decoder = nn.LSTM(hidden_lstm, input_dim, num_layers, batch_first=True)

    def forward(self, x):
        # First pass through the attention layer
        x = torch.reshape(x, (x.size(0), x.size(2), x.size(1))).to(self.device)
        x = self.masked_attention(x)
        x = torch.reshape(x, (x.size(0), x.size(2), x.size(1))).to(self.device)
        # Now pass the output through the LSTM encoder
        _, (h_n, _) = self.lstm_encoder(x)
        
        vae_outputs = []
        for _ in range(x.size(1)):
            output_vae, mu, logvar = self.vae(h_n[-1])
            vae_outputs.append(output_vae.unsqueeze(1))

        input_lstm = torch.cat(vae_outputs, dim=1)
        output_lstm, _ = self.lstm_decoder(input_lstm)
        return output_lstm, mu, logvar
    def reconstructionError(self, x):
        output, _, _ = self.forward(x)
        with torch.no_grad():
            # Calculate loss (MSE)
            loss = F.mse_loss(output, x, reduction='mean').item() 
            return loss

class MaskedAttention(nn.Module):
    def __init__(self, feature_dim, mask):
        super(MaskedAttention, self).__init__()
        self.feature_dim = feature_dim
        self.attention = nn.MultiheadAttention(embed_dim=feature_dim, num_heads=1, batch_first=True)
        self.mask = mask  # This should be a tensor of shape [sequence_length, sequence_length]

    def forward(self, x):
        # Apply attention mask. Ensure mask is correct type and on the same device as x.
        if self.mask is not None:
            mask = self.mask.to(dtype=torch.bool, device=x.device)  # Convert to boolean mask for compatibility
        else:
            mask = None
        
        attn_output, _ = self.attention(x, x, x, attn_mask=mask)
        return attn_output

class FeatureAttention(nn.Module):
    def __init__(self, seq_len, mask, num_heads=1, dropout=0.0):
        super(FeatureAttention, self).__init__()
        self.num_heads = num_heads
        self.attention = nn.MultiheadAttention(embed_dim=seq_len, num_heads=num_heads, batch_first=True)
        #self.dropout = nn.Dropout(dropout)
        self.mask = mask
    def forward(self, x):
        # x should be of shape [batch_size, 1, num_features]
        # mask should be of shape [num_features, num_features] and be a boolean tensor
        attn_output, _ = self.attention(x, x, x, attn_mask=self.mask)
        return attn_output


def loss_function(x, x_hat, mean, logvar):
    reproduction_loss = F.mse_loss(x_hat, x, reduction='sum')
    KLD = - 0.5 * torch.sum(1+ logvar - mean.pow(2) - logvar.exp())
    return reproduction_loss + KLD





# # Initialize the model
# cAutoencoder =  BADATALAutoEncoder()


# def ae_detect_anomaly(data_instance, fThreshold):
#     """
#     Processes a single data instance through the autoencoder.
    
#     Parameters:
#         data_instance (Data): The data instance (from Faust stream).
    
#     Returns:
#         tuple: A tuple containing the device_id and a binary if anomaly detected and a log for the error
#     """
#     try:
#         dResultDict = dict()
#         # Convert list of features to a tensor with a batch dimension
#         tFeaturesTensor = torch.tensor([data_instance['features']], dtype=torch.float32) #data_instance.features

#         dResultDict['device_id'] = data_instance['id'] #data_instance.id 

#         dResultDict['anomaly'] = cAutoencoder.inference(tFeaturesTensor, fThreshold)
#         dResultDict['log'] = 'success'
#     except KeyError as e:
#         # Log missing key errors (e.g., 'lFeatures' or 'sId' not found)
#         dResultDict['log'] = f"Missing key in data_instance: {e}"

#     except Exception as e:
#         # Log any other exceptions that may occur
#         dResultDict['error'] = f"An unexpected error occurred: {e}"

#     return dResultDict


if __name__ == '__main__':
    size = 6 
    mask = torch.ones((size, size)).triu(diagonal=0)
    print(mask)
#     file_path = "/Users/michiundslavki/Dropbox/JR/SerWas/cyber_attack_edge/edge_device/data/BATADAL_dataset03.csv"

#     #row.tolist()
#     df = pd.read_csv(file_path)
#     sliced_df = df.iloc[10,1:-1]
#     BADATAL_list = sliced_df.to_list()
#     data_instance = {'id': 'device4_2060', 'features': BADATAL_list, 'log': {'temperature': 29, 'status': 'normal'}}
#     #print(data_instance['id'])
#     result = ae_detect_anomaly(data_instance, 0.07)
#     print(result)

# Assume some dataset is already loaded into X_tensor
# Assume X_tensor dimensions: (batch, seq_length, features)
# Create an instance of the model

