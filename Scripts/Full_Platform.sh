#!/bin/bash

#######################################################
#                   VARIABLES                         #
#######################################################

DOCKER_BASE_PATH=".."

#######################################################
#               SilentPush API Key                    #
#######################################################

# Introduce silenpush API Key
echo -e "\nPlease, introduce the Silenpush API Key requested to Maja Otic (motic@silentpush.com):"
read enrich_key

#######################################################
#                  DFIR Model & API                   #
#######################################################

menu_dfir() {
  echo
  echo "1) Alias"
  echo "2) Claude Sonnet 4"
  echo "3) Other"
  echo
  read -p "Please, select an option (1-3): " option
}

confirmation() {
  echo
  read -n 1 -p "Are you sure you want to proceed? (y/n): " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    return 0  # User confirmed
  else
    return 1  # User did not confirm
  fi
}

read_api_key() {
  echo -e "\n\nPlease, introduce the API Key for $1:"
  read api_key_dfir
}

echo -e "\nWhat AI cloud model will you use in DFIR component?"

while true; do
  menu_dfir

  case $option in
    1)
      echo -e "\nYou have selected: Alias"
      if confirmation; then
        read_api_key "Alias"
        break
      else
        echo -e "\n\nOperation cancelled. Let's choose again the model."
        sleep 2
      fi
      ;;
    2)
      echo -e "\nYou have selected: Claude Sonnet 4"
      if confirmation; then
        read_api_key "Claude Sonnet 4"
        break
      else
        echo -e "\n\nOperation cancelled. Let's choose again the model."
        sleep 2
      fi
      ;;
    3)
      echo -e "\nYou have selected: Other"
      if confirmation; then
        echo -e "\nPlease, introduce the model:"  
        read model_dfir
        read_api_key "$model_dfir"
        break
      else
        echo -e "\n\nOperation cancelled. Let's choose again the model."
        sleep 2
      fi
      ;;
    *)
      echo -e "\n❌ Invalid option. Please, try again with a number between 1 to 3."
      sleep 2
      ;;
  esac

done

#######################################################
#                IP'S COLLECTION                      #
#######################################################

Cloud=$(cat /sys/class/dmi/id/sys_vendor)
SERVER_IP=$(hostname -I | awk '{print $1}')
if [[ "$Cloud" == "Amazon EC2" ]]; then
    SERVER_IP_PUBLIC=$(curl -s https://checkip.amazonaws.com)
    mispserver_url="https://${SERVER_IP_PUBLIC}:10443"
    echo -e "\nYour Public IP is: '$SERVER_IP_PUBLIC' and your Private IP is: '$SERVER_IP'\n"
else
    mispserver_url="https://${SERVER_IP}:10443"
    echo -e "\nYour Private IP is: '$SERVER_IP'\n"
fi

#################################################
#####     Resilmesh network creation    #########
#################################################

echo "\nThe first step of the deployment is creating the resilmesh network where all components will run.\n"

docker network create \
  --driver bridge \
  --subnet 172.19.0.0/16 \
  --gateway 172.19.0.1 \
  resilmesh_network

echo -e "\nYou can see the network in the following list:\n"
docker network ls | grep resilmesh_network

echo -e "\nThe network resilmesh_network has been created with subnet 172.19.0.0/16.\n"

##################################################
####    WAZUH ENVIRONMENT CONFIGURATION   ########
##################################################

echo -e "\nLet's continue configuring Wazuh Server!."

WAZUH_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/.env.example"
WAZUH_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/.env"

# Check if the file exists
if [ ! -f "$WAZUH_ORIGINAL_FILE" ]; then
  echo "❌ The file '$WAZUH_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$WAZUH_ORIGINAL_FILE" "$WAZUH_COPY_FILE"

echo -e "\nWazuh .env file has been created"

####################################################

# Generating server certificates
if [ ! -d $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config ]; then
  cp -r $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/base-configuration $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config
fi
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-certs.yaml up

echo "Certificates generated correctly."

# Remove lingering container
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-certs.yaml down --remove-orphans

# Generating server configuration files
docker compose --file $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-original.yaml up -d

echo "Server configuration files generated correctly."

docker compose --file $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-original.yaml down --remove-orphans

# Updating server configuration files
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules
sudo cp -t $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/rules/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders
sudo cp -t $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/decoders/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations
sudo cp -t $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/integrations/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_cluster

sudo bash -c "chmod --reference=$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/local_rules.xml ./$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/*"

sudo chgrp -R systemd-journal $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders
sudo bash -c "chmod 770 $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders/* $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/*"
sudo bash -c "chmod 750 $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations/*"

echo -e "\nLet's start building wazuh containers."
docker build -f "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/Dockerfile" "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker"

####### END WAZUH CONFIGURATION  ##########

######################################################
####      MISP SERVER CONFIGURATION         ##########
######################################################
echo -e "\n\nLet's continue configuring and deploying MISP Server!"

MISPSERVER_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/template.env"
MISPSERVER_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/.env"

# Installation process begins. Let's know the user pick up the Server IP to introduce it in the URL
echo -e "\n#####  Read the following information carefully  #####\n"

# Check if the file exists
if [ ! -f "$MISPSERVER_ORIGINAL_FILE" ]; then
  echo "❌ The file '$MISPSERVER_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from template.env
cp "$MISPSERVER_ORIGINAL_FILE" "$MISPSERVER_COPY_FILE"

# Generamos authkey misp server y la guardamos en la variable CLAVE
CLAVE=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 40)
echo -e "\nMISP Server Authkey autogenerated: $CLAVE"

# Add the URL to the .env file where BASE_URL is located
sed -i "s|^BASE_URL=.*|BASE_URL=$mispserver_url|" "$MISPSERVER_COPY_FILE"
sed -i "s|^ADMIN_KEY=.*|ADMIN_KEY=$CLAVE|" "$MISPSERVER_COPY_FILE"

echo -e "\nMISP Server .env file has been created"

#### END MISP SERVER CONFIGURATION  #######

#################################################################################################################################################################
#                                               AGGREGATION PLANE                                                                                               #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Aggregation Plane!\n"

####################################################
####      MISP CLIENT CONFIGURATION      ###########
####################################################

echo -e "\n\nLet's continue configuring MISP Client!\n"

MISPCLIENT_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/MISP_client/.env.sample"
MISPCLIENT_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/MISP_client/.env"

# Check if the file exists
if [ ! -f "$MISPCLIENT_ORIGINAL_FILE" ]; then
  echo "❌ The file '$MISPCLIENT_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.sample
cp "$MISPCLIENT_ORIGINAL_FILE" "$MISPCLIENT_COPY_FILE"

# Add the Auth Key to the .env file where MISP_API_KEY is located
sed -i "s|^MISP_API_KEY=.*|MISP_API_KEY=$CLAVE|" "$MISPCLIENT_COPY_FILE"
# Add the URL to the .env file where MISP_API_URL is located
sed -i "s|^MISP_API_URL=.*|MISP_API_URL=https://$SERVER_IP:10443|" "$MISPCLIENT_COPY_FILE"

echo -e "\nMISP Client .env file has been created"

#### END MISP CLIENT CONFIGURATION  ########

####################################################
####      VECTOR ENVIRONMENT CONFIGURATION      ####
####################################################

echo -e "\n\nLet's continue configuring Vector!"

VECTOR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/Vector/.env.sample"
VECTOR_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/Vector/.env"

# Check if the file exists
if [ ! -f "$VECTOR_ORIGINAL_FILE" ]; then
  echo "❌ The file '$VECTOR_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$VECTOR_ORIGINAL_FILE" "$VECTOR_COPY_FILE"

echo -e "\nVector .env file has been created"

####### END VECTOR CONFIGURATION  ##########

####################################################
####    ENRICHMENT ENVIRONMENT CONFIGURATION    ####
####################################################

echo -e "\nLet's continue configuring Enrichment!"

ENRICHMENT_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/Enrichment/.env.sample"
ENRICHMENT_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/Enrichment/.env"

# Check if the file exists
if [ ! -f "$ENRICHMENT_ORIGINAL_FILE" ]; then
  echo "❌ The file '$ENRICHMENT_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.sample
cp "$ENRICHMENT_ORIGINAL_FILE" "$ENRICHMENT_COPY_FILE"

# Add the Wazuh manager container IP to the .env file where RSYSLOG_HOST is located
sed -i "s|^API_KEY=.*|API_KEY=$enrich_key|" "../Aggregation/Enrichment/.env"

echo -e "\nEnrichment .env file has been created"
echo "✅ Aggregation Plane has been configured."

####### END ENRICHMENT CONFIGURATION  ##########


#################################################################################################################################################################
#                                               SECURITY OPERATIONS PLANE                                                                                       #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Security Operations Plane!\n"

####### WORKFLOW ORCHESTRATOR CONFIGURATION ############

# No preconfiguration needed.

####### END WORKFLOW ORCHESTRATOR CONFIGURATION ############

####### PLAYBOOKS TOOL CONFIGURATION ############

echo -e "\nStarting with Playbooks Tool component configuration..."

mkdir -p $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/database
mkdir -p $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/apps
mkdir -p $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/files
chown -R 1000:1000 $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes
chmod -R 755 $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes
sudo swapoff -a

PBTOOL_ORIGINAL_FILE="$DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env.example"
PBTOOL_COPY_FILE="$DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env"

# Check if the file exists
if [ ! -f "$PBTOOL_ORIGINAL_FILE" ]; then
  echo "❌ The file '$PBTOOL_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$PBTOOL_ORIGINAL_FILE" "$PBTOOL_COPY_FILE"

echo -e "\n✅ File .env created."

####### END PLAYBOOKS TOOL CONFIGURATION ############

####### MITIGATION MANAGER CONFIGURATION ############

echo -e "\nLet's continue with Mitigation Manager component configuration..."
echo -e "\nCreating Mitigation Manager .env file..."

MM_ORIGINAL_FILE="$DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env.example"
MM_COPY_FILE="$DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env"

# Check if the file exists
if [ ! -f "$MM_ORIGINAL_FILE" ]; then
  echo "❌ The file '$MM_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$MM_ORIGINAL_FILE" "$MM_COPY_FILE"

echo -e "\n✅ File .env created."
echo "--> IMPORTANT!! If you need any custom integrations, go to the installation guide and check how to create custom integrations between Mitigation Manager and Wazuh."

echo -e "\nSecurity Operations Plane has been now deployed"

#################################################################################################################################################################
#                                               SITUATION ASSESSMENT PLANE                                                                                      #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Situation Assessment Plane!\n"

#################### CASM #################

echo -e "\nStarting with CASM component configuration..."
echo -e "\nInstalling python3-poetry to create the venv and install all dependencies"
sudo apt install python3-poetry -y

echo -e "\nCreating the virtual environment and install all dependencies..."

sed -i "s|x_api_key: \"\"|x_api_key: \"$enrich_key\"|" "$DOCKER_BASE_PATH/Situation-Assessment/CASM/docker/config.yaml"

sudo apt remove npm nodejs -y
sudo apt autoremove -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

sudo apt install nodejs ng-common -y
echo -e "\n✅ Nodejs and npm installed."

#################### ISIM #################
echo -e "\nLet's start with ISIM..."

# Create and edit the .env file (see env.example)
ISIM_ORIGINAL_FILE="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/env.example"
ISIM_COPY_FILE="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/.env"
ISIM_RISK_API="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/neo4j_adapter/risk_api.py"

# Check if the file exists
if [ ! -f "$ISIM_ORIGINAL_FILE" ]; then
  echo "❌ The file '$ISIM_ORIGINAL_FILE' do not exist."
  exit 1
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$ISIM_ORIGINAL_FILE"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$ISIM_ORIGINAL_FILE" 
fi


# Create .env file from .env.example
cp "$ISIM_ORIGINAL_FILE" "$ISIM_COPY_FILE"

echo -e "\n✅ File .env created."

# Check if the file exists
if [ ! -f "$ISIM_RISK_API" ]; then
  echo "❌ The file '$ISIM_RISK_API' do not exist."
  exit 1
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$ISIM_RISK_API"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$ISIM_RISK_API" 
fi

##################### NSE #################

echo -e "\nStarting with NSE component configuration..."

echo -e "\nCreating NSE .env file..."

NSE_FILE=$DOCKER_BASE_PATH/Situation-Assessment/NSE/.env

cat <<EOF >"$NSE_FILE"
NEO4J_URI=bolt://resilmesh_sap_neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=supertestovaciheslo
OS_HOST=https://resilmesh_tap_wazuh_indexer:9200
OS_USER=admin
OS_PASSWORD=SecretPassword
OS_INDEX=wazuh-alerts-*
TEMPORAL_HOST=resilmesh_sop_wo_temporal
EOF

echo -e "\n✅ .env file has been created."

echo -e "\nModifying NSE environment.ts file..."
NSE_ENV_PRODTS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/NSE/src/environments/environment.prod.ts"
NSE_ENV_TS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/NSE/src/environments/environment.ts"
NSE_RISK_CONFIG_FILE="$DOCKER_BASE_PATH/Situation-Assessment/NSE/src/app/services/risk-config.service.ts"
NSE_LAUNCH="$DOCKER_BASE_PATH/Situation-Assessment/NSE/.vscode/launch.json"

# Check if the file exists
if [ ! -f "$NSE_ENV_PRODTS_FILE" ]; then
 echo "❌ The file '$NSE_ENV_PRODTS_FILE' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$NSE_ENV_TS_FILE" ]; then
 echo "❌ The file '$NSE_ENV_TS_FILE' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$NSE_RISK_CONFIG_FILE" ]; then
 echo "❌ The file '$NSE_RISK_CONFIG_FILE' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$NSE_LAUNCH" ]; then
 echo "❌ The file '$NSE_LAUNCH' do not exist."
 exit 1
fi

# Add the Server IP to environment files where Server IP should be allocated instead localhost.
if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NSE_ENV_PRODTS_FILE"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$NSE_ENV_PRODTS_FILE" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NSE_ENV_TS_FILE"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$NSE_ENV_TS_FILE" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NSE_RISK_CONFIG_FILE"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$NSE_RISK_CONFIG_FILE" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NSE_LAUNCH"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$NSE_LAUNCH" 
fi


echo -e "\n✅ Server IP added for environment.ts and environment.prod.ts config files."

################### SACD ################

echo -e "\nLet's start with SACD component configuration..."

SACD_ENV_PRODTS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.prod.ts"
SACD_ENV_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.ts"
SACD_EXTERNAL="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/external.ts"
SACD_ENV_FILE_MISSION_EDITOR="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/pages/mission-editor-page/mission-editor.service.ts"

# Check if the file exists
if [ ! -f "$SACD_ENV_PRODTS_FILE" ]; then
 echo "❌ The file '$SACD_ENV_PRODTS_FILE' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$SACD_ENV_FILE" ]; then
 echo "❌ The file '$SACD_ENV_FILE' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$SACD_EXTERNAL" ]; then
 echo "❌ The file '$SACD_EXTERNAL' do not exist."
 exit 1
fi

# Check if the file exists
if [ ! -f "$SACD_ENV_FILE_MISSION_EDITOR" ]; then
 echo "❌ The file '$SACD_ENV_FILE_MISSION_EDITOR' do not exist."
 exit 1
fi

# Add the Server IP fl_agent.conf and ai_detection_engine.conf files where Server IP should be allocated
if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i 's/localhost/'"$SERVER_IP_PUBLIC"'/g' "$SACD_ENV_PRODTS_FILE"
else
    sed -i 's/localhost/'"$SERVER_IP"'/g' "$SACD_ENV_PRODTS_FILE" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i 's/localhost/'"$SERVER_IP_PUBLIC"'/g' "$SACD_ENV_FILE"
else
    sed -i 's/localhost/'"$SERVER_IP"'/g' "$SACD_ENV_FILE" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$SACD_EXTERNAL"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$SACD_EXTERNAL" 
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$SACD_ENV_FILE_MISSION_EDITOR"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$SACD_ENV_FILE_MISSION_EDITOR" 
fi

echo -e "\n✅ Server IP added for environment.ts and environment.prod.ts config files."

#########   NETWORK AND DETECTION RESPONSE (NDR)   ################
echo -e "\nLet's start with Network and Detection Response..."

# Create and edit the .env file (see env.example)
NDR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example"
NDR_COPY_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"

# Check if the file exists
if [ ! -f "$NDR_ORIGINAL_FILE" ]; then
  echo "❌ The file '$NDR_ORIGINAL_FILE' do not exist."
  exit 1
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NDR_ORIGINAL_FILE"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$NDR_ORIGINAL_FILE" 
fi


# Create .env file from .env.example
cp "$NDR_ORIGINAL_FILE" "$NDR_COPY_FILE"

echo -e "\n✅ File .env created."

###########   LANDING PAGE CONFIGURATION  ####################################
  
if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i 's/localhost/'"$SERVER_IP_PUBLIC"'/g' "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json"
    echo -e "\n✅ All landing page services URLs have been configured from 'localhost' to '$SERVER_IP_PUBLIC' in the file /Landing-Page/src/data/entries.json."
else
    sed -i 's/localhost/'"$SERVER_IP"'/g' "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json" 
    echo -e "\n✅ All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."
fi


###########   END LANDING PAGE CONFIGURATION  ################################

##############################################################################
#                           THREAT AWARENESS PLANE                           #                                                               
##############################################################################

echo -e "\nLet's start with configuring components in Threat Awareness Plane!\n"

####### AI BASED DETECTOR CONFIGURATION  ##########
echo -e "\nStarting with AI Based Detector component configuration..."
AI_AD_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/AI_Based_Detector/.env.sample"
AI_AD_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/AI_Based_Detector/.env"

# Check if the file exists
if [ ! -f "$AI_AD_ORIGINAL_FILE" ]; then
  echo "❌ The file '$AI_AD_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$AI_AD_ORIGINAL_FILE" "$AI_AD_COPY_FILE"

echo -e "\n✅ File .env created."
####### END AI BASED DETECTOR CONFIGURATION  ##########

echo -e "\nStarting with Federated Learning component configuration..."

####### FEDERATED LEARNING CONFIGURATION  ##########
FLAD_AGENT_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent/config/fl_agent.conf"
FLAD_AGENT_ORIGINAL_FILE2="$DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/ai-detection-engine/config/ai_detection_engine.conf"

# Check if the file exists
if [ ! -f "$FLAD_AGENT_ORIGINAL_FILE" ]; then
  echo "❌ The file '$FLAD_AGENT_ORIGINAL_FILE' do not exist."
  exit 1
fi

if [ ! -f "$FLAD_AGENT_ORIGINAL_FILE2" ]; then
  echo "❌ The file '$FLAD_AGENT_ORIGINAL_FILE2' do not exist."
  exit 1
fi

# Add the Server IP fl_agent.conf and ai_detection_engine.conf files where Server IP should be allocated
sed -i "s|155\.54\.205\.196|${SERVER_IP}|g" "$FLAD_AGENT_ORIGINAL_FILE"
sed -i "s|155\.54\.205\.196|${SERVER_IP}|g" "$FLAD_AGENT_ORIGINAL_FILE2"

echo -e "\n✅ Server IP added for FL_Agent and AI_Detection_Engine config files."

#Build ai-detection-engine component
docker build -t ai-detection-engine -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/ai-detection-engine/Dockerfile $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/ai-detection-engine/

#Build fl-aggregator component
docker build -t fl-aggregator -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-aggregator/Dockerfile $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-aggregator/

#Build fl-agent component
docker build -t fl-agent -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent/Dockerfile $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent/

#Executing the components
docker run -p "9998:9998" -d ai-detection-engine
docker run -p "9999:9999" -d fl-aggregator
docker run -d fl-agent

#### Add ssh connection to the second server where a new agent need to be deployed in #####
#echo "A second Federated Learning Agent needs to be deployed in another server, please go there and deploy it"
#echo "Follow the next steps:"
#echo "1. Copy the $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent folder to the new server"
#echo "2. Build the agent image and run it using the these commands: docker build -t fl-agent / docker run -d fl-agent"

####### END FEDERATED LEARNING CONFIGURATION  ##########

#######   IoB Configuration  ###########################

echo -e "\nLet's continue with IoB component configuration..."

IOB_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env.example"
IOB_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"
IOB_INTEGRATIONS="$DOCKER_BASE_PATH/Threat-Awareness/IoB/attack_flow_builder/src/components/Elements/IntegrationToolsDialog.vue"

# Check if the file exists
if [ ! -f "$IOB_ORIGINAL_FILE" ]; then
  echo "❌ The file '$IOB_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$IOB_ORIGINAL_FILE" "$IOB_COPY_FILE"

echo -e "\n✅ File .env created."

# Check if the file exists
if [ ! -f "$IOB_INTEGRATIONS" ]; then
  echo "❌ The file '$IOB_INTEGRATIONS' do not exist."
  exit 1
fi

if [[ "$Cloud" == "Amazon EC2" ]]; then
    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$IOB_INTEGRATIONS"
else
    sed -i "s|localhost|${SERVER_IP}|g" "$IOB_INTEGRATIONS" 
fi

# Verify build dependencies
# if ! command -v npm >/dev/null 2>&1; then
#   sudo apt update
#   sudo apt install nodejs npm -y
# fi

# export NODE_OPTIONS="--openssl-legacy-provider"

NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app" install
NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app" run build

#######   END IoB Configuration  ###########################


#######   PP-CTI Configuration   ###########################

echo -e "\nLet's continue with PP-CTI component configuration..."
PPCTI_ANONYMIZER_CONFIGFILE=$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/anonymizer/config.yaml

sed -i "s|<YOUR_MISP_KEY>|$CLAVE|g" "$PPCTI_ANONYMIZER_CONFIGFILE"
sed -i "s#https://<YOUR_MISP_URL>#$mispserver_url#g" "$PPCTI_ANONYMIZER_CONFIGFILE"

echo -e "\n✅ Config.yaml updated with Misp Server configuration."

echo -e "\nInstalling Java dependencies...\n"

sudo apt update
sudo apt install openjdk-21-jdk -y

echo -e "\n✅ Java 21 (OpenJDK 21) installed.\n"

docker build ./$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/flaskdp

echo -e "\n✅ FlaskDP image built.\n"

./$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/arxlet/gradlew -p $DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/arxlet server:dockerImage

echo -e "\n✅ ARXlet image built.\n"

#######   END PP-CTI Configuration   #######################

#######   Threat-Hunting-And-Forensics Configuration   ###########################

echo -e "\nLet's continue with Threat-Hunting-And-Forensics component configuration..."
echo -e "\nCreating DFIR .env file..."
DFIR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/DFIR/.env.example"
DFIR_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/DFIR/.env"

# Check if the file exists
if [ ! -f "$DFIR_ORIGINAL_FILE" ]; then
  echo "❌ The file '$DFIR_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$DFIR_ORIGINAL_FILE" "$DFIR_COPY_FILE"

# Add the model and API Key to the .env file where API_KEY is located
case $option in
    1)
      sed -i "s|^ALIAS_API_KEY=.*|ALIAS_API_KEY=$api_key_dfir|" "$DFIR_COPY_FILE"
      ;;
    2)
      sed -i "s|^CAI_MODEL=.*|CAI_MODEL=claude-sonnet-4-20250514|" "$DFIR_COPY_FILE"
      sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$api_key_dfir|" "$DFIR_COPY_FILE"
      ;; 
    3)
      sed -i "s|^CAI_MODEL=.*|CAI_MODEL=$model_dfir|" "$DFIR_COPY_FILE"
      sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key_dfir|" "$DFIR_COPY_FILE"
      ;;
  esac

echo -e "\n✅ File .env created."


echo -e "\nCreating THF .env file..."

THF_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/THF/.env.example"
THF_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/THF/.env"

# Check if the file exists
if [ ! -f "$THF_ORIGINAL_FILE" ]; then
  echo "❌ The file '$THF_ORIGINAL_FILE' do not exist."
  exit 1
fi

cp "$THF_ORIGINAL_FILE" "$THF_COPY_FILE"

echo -e "\n✅ File .env created."

#######   END Threat-Hunting-And-Forensics Configuration   #######################

##################################################################################
#                     COMPOSE FILES EXECUTION                                    #
##################################################################################

# echo -e "\nEnter to start docker compose build..."
# read

# docker compose -f $DOCKER_BASE_PATH/Dockerfile build

echo -e "\nStarting main docker compose up..."
docker compose -f $DOCKER_BASE_PATH/docker-compose-Full_Platform.yml up -d

#################################################################################
#                     CONFIGURATION WAZUH DOCKER CONTAINER                      #
#################################################################################

CONTAINER="resilmesh_tap_wazuh_manager"
echo -e "\nStarting Wazuh Manager container configuration..."
echo -e "\nInstalling telnet in the $CONTAINER..."
read -t 2
docker exec -u 0 -it "$CONTAINER" yum install -y telnet

echo -e "\nInstalling rsyslog in the $CONTAINER..."
read -t 2
docker exec -u 0 -it "$CONTAINER" yum install -y rsyslog

echo -e "\nInstalling nano in the $CONTAINER..."
read -t 2
docker exec -u 0 -it "$CONTAINER" yum install -y nano

echo -e "\nCreating Resilmesh.conf and adding the content to it in the $CONTAINER..."
read -t 2
docker exec -u 0 -it "$CONTAINER" bash -c 'cat <<"EOF" > /etc/rsyslog.d/Resilmesh.conf
module(load="imptcp" threads="3")
input(type="imptcp" port="10514"
ruleset="writeResilmeshEvents")
ruleset(name="writeResilmeshEvents"
queue.type="fixedArray"
queue.size="250000"
queue.dequeueBatchSize="4096"
queue.workerThreads="4"
queue.workerThreadMinimumMessages="60000"
) {
action(type="omfile" file="/var/log/Resilmesh.log"
ioBufferSize="64k" flushOnTXEnd="off"
asyncWriting="on")
}
EOF'

echo -e "\nStarting rsyslogd now"
docker exec -u 0 "$CONTAINER" rsyslogd
echo -e "\nAll Wazuh container configuration are now ready."
##############  END WAZUH CONTAINER CONFIGURATION  ###############################################

############## ISIM REST COLLECTSTATIC  ###############################################
docker exec -it resilmesh_sap_isim python /app/isim_rest/manage.py collectstatic --noinput
docker restart resilmesh_sap_isim
########### END ISIM REST COLLECTSTATIC  ###############################################

# Test data injection from Vector to Wazuh Manager to test rsyslog
echo -e "\nInjecting test data from Vector to test rsyslog configuration..."
read -t 5
docker exec -u 0 Vector bash -c 'tail -n50 /etc/vector/datasets/CESNET/bad_ips.csv >> /etc/vector/datasets/CESNET/bad_ips.csv'

echo -e "\nData already inyected."

### Executing CASM scans ##########################################################################
docker exec -u 0 resilmesh_sap_casm_easm-worker bash -c 'python -m temporal.easm.parent_workflow'
docker exec -it resilmesh_sap_casm_nmap-worker python -m temporal.nmap.topology.workflow && docker exec -it resilmesh_sap_casm_nmap-worker python -m temporal.nmap.basic.workflow
docker exec -it resilmesh_sap_casm_slp-enrichment python -m temporal.slp_enrichment.workflow

#############  FINAL SUMMARY  ###################################################################

# Calculate script duration
duration=$SECONDS
duration_minutes=$(($duration / 60))
duration_seconds=$(($duration % 60))
echo -e "\nScript duration: $duration_minutes minutes and $duration_seconds seconds.\n"

# If the cloud provider is Amazon EC2, use the public IP for accessing the services
if [[ "$Cloud" == "Amazon EC2" ]]; then
    SERVER_IP=$SERVER_IP_PUBLIC
fi

# Final summary of changes
echo -e "\nThis is a summary of all the changes made during the execution:\n"
echo -e "- resilmesh_network has been created: IP 172.19.0.0/16"
echo -e "- Environment files created for Wazuh Server, Misp Server, Vector, Enrichment, Misp Client, Mitigation Manager, PBTools, SACD and NSE."
echo -e "- You have entered the SLP key: $enrich_key"
echo -e "- You have selected the DFIR model: $model_dfir"
echo -e "- You have entered the DFIR API key: $api_key_dfir"
echo -e "- MISP Server Authkey autogenerated: $CLAVE"
echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."


echo -e "\nBelow you can find the URLs to access the services:\n"
echo -e "- The component Wazuh Server is accesible on: https://$SERVER_IP:4433"
echo -e "- The component MISP Server is accessible on: https://$SERVER_IP:10443"
echo -e "- The component Workflow Orchestrator (Temporal) is accesible on: http://$SERVER_IP:8080"
echo -e "- The component Playbooks Tool (Shuffle) is accesible on: https://$SERVER_IP:3443"
echo -e "- The component Landing Page is accesible on: http://$SERVER_IP:8181"
echo -e "- The component CASM is accesible on: http://$SERVER_IP:8000"
echo -e "- The component ISIM (Neo4j) is accesible on: http://$SERVER_IP:7474"
echo -e "- The component ISIM (Graphql) is accesible on: http://$SERVER_IP:4001/graphql"
echo -e "- The component NDR is accesible on: http://$SERVER_IP:3000"
echo -e "- The component SACD is accesible on: http://$SERVER_IP:4200"
echo -e "- The component NSE Angular frontend is accesible on: http://$SERVER_IP:4201"
echo -e "- The component NSE Flask Risk API is accesible on: http://$SERVER_IP:3002"
echo -e "- The component IoB Attack Flow Builder is accesible on: http://$SERVER_IP:9080"
echo -e "- The component IoB Sanic Web Server is accesible on: http://$SERVER_IP:9003"
echo -e "- The component IoB STIX Modeler is accesible on: http://$SERVER_IP:3400"
echo -e "- The component IoB CTI STIX Visualization is accesible on: http://$SERVER_IP:9003/cti-stix-visualization/index.html"
echo -e "- The component DFIR is accesible on: http://$SERVER_IP:5000"
echo -e "- The component THF is accesible on: http://$SERVER_IP:8501"
echo -e "- The component PP-CTI Anonymizer is accesible on: http://$SERVER_IP:8070"
echo -e "- The component PP-CTI Frontend is accesible on: http://$SERVER_IP:3100"

echo -e "\n\nA new file output_summary.txt has been created with a summary of the changes.\n"


# Create output_summary.txt file with the summary of changes
{
    echo -e "\nThis is a summary of all the changes made during the execution:\n"
    echo -e "- resilmesh_network has been created: IP 172.19.0.0/16"
    echo -e "- Environment files created for Wazuh Server, Misp Server, Vector, Enrichment, Misp Client, Mitigation Manager, PBTools, SACD and NSE."
    echo -e "- You have entered the SLP key: $enrich_key"
    echo -e "- You have selected the DFIR model: $model_dfir"
    echo -e "- You have entered the DFIR API key: $api_key_dfir"
    echo -e "- MISP Server Authkey autogenerated: $CLAVE \n"
    echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."

    SEPARATOR="+----------------------+----------------------------+----------+-----------------+-------+----------------------------------------------------------------+"

    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+\n"
    printf "|                                                          Components                                                                                     |\n"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Plane" "Service" "Protocol" "IP Address" "Port" "URL"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "Wazuh Server" "HTTPS" "$SERVER_IP" "4433" "https://$SERVER_IP:4433"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "MISP Server" "HTTPS" "$SERVER_IP" "10443" "https://$SERVER_IP:10443"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Security Operations" "Workflow Orchestrator" "HTTP" "$SERVER_IP" "8080" "http://$SERVER_IP:8080"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Security Operations" "Playbooks Tool" "HTTPS" "$SERVER_IP" "3443" "https://$SERVER_IP:3443"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "Landing page" "HTTP" "$SERVER_IP" "8181" "http://$SERVER_IP:8181"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "CASM" "HTTP" "$SERVER_IP" "8000" "http://$SERVER_IP:8000"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "ISIM Neo4j" "HTTP" "$SERVER_IP" "7474" "http://$SERVER_IP:7474"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "ISIM Graphql" "HTTP" "$SERVER_IP" "4001" "http://$SERVER_IP:4001/graphql"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "NDR" "HTTP" "$SERVER_IP" "3000" "http://$SERVER_IP:3000"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "SACD" "HTTP" "$SERVER_IP" "4200" "http://$SERVER_IP:4200"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "NSE Angular Frontend" "HTTP" "$SERVER_IP" "4201" "http://$SERVER_IP:4201"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "NSE Flask Risk API" "HTTP" "$SERVER_IP" "3002" "http://$SERVER_IP:3002"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "IoB Attack Flow Builder" "HTTP" "$SERVER_IP" "9080" "http://$SERVER_IP:9080"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "IoB Sanic Web Server" "HTTP" "$SERVER_IP" "9003" "http://$SERVER_IP:9003"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "IoB STIX Modeler" "HTTP" "$SERVER_IP" "3400" "http://$SERVER_IP:3400"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "IoB CTI STIX Visualization" "HTTP" "$SERVER_IP" "9003" "http://$SERVER_IP:9003/cti-stix-visualization/index.html"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "DFIR" "HTTP" "$SERVER_IP" "5000" "http://$SERVER_IP:5000"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "THF" "HTTP" "$SERVER_IP" "8501" "http://$SERVER_IP:8501"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "PP-CTI Anonymizer" "HTTP" "$SERVER_IP" "8070" "http://$SERVER_IP:8070"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "PP-CTI Frontend" "HTTP" "$SERVER_IP" "3100" "http://$SERVER_IP:3100"
    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+"
    printf "\n\n"
} > ./output_summary.txt