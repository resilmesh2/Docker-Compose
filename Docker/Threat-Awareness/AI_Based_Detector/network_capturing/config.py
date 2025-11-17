import os

# Get the directory where config.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Build the log path relative to config.py
LOG_PATH = os.path.join(BASE_DIR, "output", "logs", "NFstream.log")
# Get the directory part of the log file path
LOG_DIR = os.path.dirname(LOG_PATH)

# Check if the directory exists and create it if it does not
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Now you can open the file safely. The 'a' mode will create the file if it doesn't exist.
try:
    with open(LOG_PATH, 'a') as log_file:
        log_file.write("Log file created or appended.\n")
except IOError as e:
    print(f"An error occurred while creating the log file: {e}")

    
PCAP_files_dir = "/home/digital/Documents/test-nfstream/test_output"
# keep in mind that this here should later come from a statistical analysis, so hardcoded for now ok
DEFAULT_IMPORTANT_FEATURES = [ 
    "src_ip",
    "src_port",
    "dst_ip",
    "dst_port",
    "protocol",
    "bidirectional_packets",
    "bidirectional_bytes",
    "application_name"
]
from nfstream import NFPlugin
class ModelPrediction(NFPlugin):
    def on_init(self, packet, flow):
        flow.udps.nix = 0
        
DEFAULT_NFSTREAM_CONFIG = {
    'source': '/home/digital/Documents/test-nfstream/stream_class/pcap_files/ajp.pcap',
    'decode_tunnels': True,
    'bpf_filter': None,
    'promiscuous_mode': False, # Typically false for file processing, true for live capture
    'snapshot_length': 1536,
    'idle_timeout': 120,
    'active_timeout': 1800,
    'accounting_mode': 0,
    # 'udps': ModelPrediction(),
    'n_dissections': 20,
    'statistical_analysis': True,
    'splt_analysis': 0,
    'n_meters': 0,
    'max_nflows': 0,
    'performance_report': 0,
    'system_visibility_mode': 0,
    'system_visibility_poll_ms': 100
}

