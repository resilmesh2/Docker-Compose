# Threat-Hunting-And-Forensics

The THF component is based on Wazuh and OpenSearch, i.e., the Resilmesh SIEM, and is primarily built using the capabilities of those components.

## Execution

The GitLab repository contains:

1. **Datasets**: 6 datasets are provided to facilitate different aspects of the threat hunting process.
2. **Notebooks**: A single `.ndjson` file containing 6 notebooks.
3. **Dashboard and Visualisations**: A single `.ndjson` file includes 1 pre-configured dashboard and several visualisations to help interpret and analyse the data.

## Installation Script

The repository provides an `install.sh` script to help users import all components into their own OpenSearch instance. This script automates the setup process to ensure that the datasets, notebooks, dashboard, and visualisations are ready to use.

### Run the Installation Script for Datasets:

```bash
mv install_data_note.sh datasets-notebooks/
cd datasets-notebooks
chmod +x install_data_note.sh
./install_data_note.sh

mv install_data_wazuh.sh datasets-wazuhalert/
cd datasets-wazuhalert
chmod +x install_data_wazuh.sh
./install_data_wazuh.sh
```
### Run the Installation Script for Notebooks and Visualisations

```
cd Threat-Hunting-And-Forensics
chmod +x install_noteviz.sh
./install_noteviz.sh
```
