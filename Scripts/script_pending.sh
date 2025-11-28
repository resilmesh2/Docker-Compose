#!/bin/bash


echo -e "\n\n\n"
cat <<'EOF'
 /$$$$$$$                      /$$ /$$ /$$      /$$                     /$$
| $$__  $$                    |__/| $$| $$$    /$$$                    | $$
| $$  \ $$  /$$$$$$   /$$$$$$$ /$$| $$| $$$$  /$$$$  /$$$$$$   /$$$$$$$| $$$$$$$
| $$$$$$$/ /$$__  $$ /$$_____/| $$| $$| $$ $$/$$ $$ /$$__  $$ /$$_____/| $$__  $$
| $$__  $$| $$$$$$$$|  $$$$$$ | $$| $$| $$  $$$| $$| $$$$$$$$|  $$$$$$ | $$  \ $$
| $$  \ $$| $$_____/ \____  $$| $$| $$| $$\  $ | $$| $$_____/ \____  $$| $$  | $$
| $$  | $$|  $$$$$$$ /$$$$$$$/| $$| $$| $$ \/  | $$|  $$$$$$$ /$$$$$$$/| $$  | $$
|__/  |__/ \_______/|_______/ |__/|__/|__/     |__/ \_______/|_______/ |__/  |__/
EOF
echo -e "\n\n\n"



#################################################
#####                Proxy              #########
#################################################

## Are you behind a proxy? Complete the following information
DOCKER_BASE_PATH=".."
DOCKER_ORIGINAL_FILE="$DOCKER_BASE_PATH/.env.sample"
DOCKER_COPY_FILE="$DOCKER_BASE_PATH/.env"


read -n 1 -p "Are you behind a proxy? (y/n): " answer

if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo "You said that you have a proxy, let's configure it."
    # If the answer is yes, ask for the proxy configuration
    read -p "Enter your http configuration (Example --> http_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line1
    read -p "Enter your https configuration (Example --> https_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line2

    # Add the lines at the end of the .env file
    echo "$line1" >> "$DOCKER_COPY_FILE"
    echo "$line2" >> "$DOCKER_COPY_FILE"

    echo "Your proxy configuraion has been saved in $fichero"
else
    echo -e "\nYou said that you don't have a proxy.\n\n"
fi


#######################################################
#                IP'S COLLECTION                      #
#######################################################
Cloud=$(cat /sys/class/dmi/id/sys_vendor)
SERVER_IP=$(hostname -i)
if [[ "$Cloud" == "Amazon EC2"]]; then
    SERVER_IP_PUBLIC=$(curl https://checkip.amazonaws.com)
    mispserver_url="https://${SERVER_IP_PUBLIC}:10443"
    echo -e "\nYour Public IP is: '$SERVER_IP_PUBLIC' and your Private IP is: '$SERVER_IP'"
else
    mispserver_url="https://${SERVER_IP}:10443"
    echo -e "\nYour Private IP is: '$SERVER_IP'\n"
fi
read -t 3

# if [[ "$answer_Cloud" == "y" || "$answer_Cloud" == "Y" ]]; then
#     SERVER_IP_PUBLIC=$(curl https://checkip.amazonaws.com)
#     mispserver_url="https://${SERVER_IP_PUBLIC}:10443"
#     echo -e "\nYour Public IP is: '$SERVER_IP_PUBLIC' and your Private IP is: '$SERVER_IP'"
# else
#     mispserver_url="https://${SERVER_IP}:10443"
#     echo -e "\nYour Private IP is: '$SERVER_IP'\n"
# fi
# read -t 3

#################################################
#####     Resilmesh network creation    #########
#################################################

echo "The first step of the deployment is creating the resilmesh network where all components will run."
read -t 3

docker network create \
  --driver bridge \
  --subnet 172.19.0.0/16 \
  --gateway 172.19.0.1 \
  resilmesh_network

echo -e "\n\nYou can see the network in the following list\n"
docker network ls | grep resilmesh_network
read -t 4

echo -e "\nThe network resilmesh_network has been created with subnet 172.19.0.0/16."
read -t 4

#### END NETWORK CREATION  ########

##################################################
####    WAZUH ENVIRONMENT CONFIGURATION   ########
##################################################

echo -e "\nLet's continue configuring Wazuh Server!."
read -t 2

WAZUH_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/.env.example"
WAZUH_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/.env"
WAZUH_TARGET_LINE=4
WAZUH_KEY_WORD="MANAGER_IP=" # keep the text and add the Auth key behind

# Check if the file exists
if [ ! -f "$WAZUH_ORIGINAL_FILE" ]; then
  echo "❌ The file '$WAZUH_ORIGINAL_FILE' do not exist."
  exit 1
fi

#echo -e "Please select an IP to configure wazuh manager inside resilmesh_network, example: 172.19.0.100"
#docker network inspect resilmesh_network | grep "Subnet"

#echo -e "\nEnter the IP and press enter:"
#read WAZUH_IP
WAZUH_IP=172.19.0.100

# Create .env file from .env.example
cp "$WAZUH_ORIGINAL_FILE" "$WAZUH_COPY_FILE"

# Add the Wazuh manager container IP to the .env file where MANAGER IP is located
sed -i "${WAZUH_TARGET_LINE}s|\(${WAZUH_KEY_WORD} *\).*|\1$WAZUH_IP|" "$WAZUH_COPY_FILE"

echo -e "\nWazuh .env file has been created"
echo "✅ Line $WAZUH_TARGET_LINE updated in '$WAZUH_COPY_FILE'."

####################################################


# Generating server certificates
if [ ! -d $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config ]; then
  cp -r $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/base-configuration $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config
fi
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-certs.yaml up

echo "Certificates generated correctly."
read -t 2

# Remove lingering container
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-certs.yaml down --remove-orphans

# Generating server configuration files
docker compose --file $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-original.yaml up -d

echo "Server configuration files generated correctly."
read -t 2

docker compose --file $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-original.yaml down --remove-orphans

# Updating server configuration files
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules
sudo cp -t $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/rules/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders
sudo cp -t $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/decoders/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations
#cp -t config/wazuh_integrations integrations/*
sudo mkdir -p $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_cluster

sudo bash -c "chmod --reference=$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/local_rules.xml ./$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/*"

sudo chgrp -R systemd-journal $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders
sudo bash -c "chmod 770 $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/decoders/* $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_etc/rules/*"
# sudo bash -c 'chmod 750 $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config/wazuh_integrations/*'

echo -e "\nLet's start deploying wazuh containers."
read -t 2
# docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml up --build -d
docker compose -f "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml" build
read -t 2
docker compose -f "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml" up -d

echo -e "\nWazuh has been already deployed."
read -t 2

####### END WAZUH CONFIGURATION  ##########

######################################################
####      MISP SERVER CONFIGURATION         ##########
######################################################
echo -e "\n\nLet's continue configuring and deploying MISP Server!"
read -t 2

MISPSERVER_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/template.env"
MISPSERVER_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/.env"
MISPSERVER_TARGET_LINE=60
MISPSERVER_KEY_WORD="BASE_URL="  # keep the text and add new content behind
MISPSERVER_TARGET_LINE2=48
MISPSERVER_KEY_WORD2="ADMIN_KEY="

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
read -t 2

# Add the URL to the .env file where BASE_URL is located
sed -i "${MISPSERVER_TARGET_LINE}s|\(${MISPSERVER_KEY_WORD} *\).*|\1$mispserver_url|" "$MISPSERVER_COPY_FILE"
sed -i "${MISPSERVER_TARGET_LINE2}s|\(${MISPSERVER_KEY_WORD2} *\).*|\1$CLAVE|" "$MISPSERVER_COPY_FILE"

echo -e "\nMISP Server .env file has been created"
echo "✅ Line $MISPSERVER_TARGET_LINE updated in '$MISPSERVER_COPY_FILE'."
echo "✅ Line $MISPSERVER_TARGET_LINE2 updated in '$MISPSERVER_COPY_FILE'."

#### END MISP SERVER CONFIGURATION  #######


#################################################################################################################################################################
#                                               AGGREGATION PLANE                                                                                               #
#################################################################################################################################################################

####################################################
####      MISP CLIENT CONFIGURATION      ###########
####################################################

echo -e "\n\nLet's continue configuring MISP Client!\n"
read -t 2

MISPCLIENT_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/MISP_client/.env.sample"
MISPCLIENT_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/MISP_client/.env"
MISPCLIENT_TARGET_LINE1=2
MISPCLIENT_TARGET_LINE2=3
MISPCLIENT_KEY_WORD1="MISP_API_KEY=" # keep the text and add the Auth key behind
MISPCLIENT_KEY_WORD2="MISP_API_URL=" # keep the text and add the MISP Server url behind

# Check if the file exists
if [ ! -f "$MISPCLIENT_ORIGINAL_FILE" ]; then
  echo "❌ The file '$MISPCLIENT_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.sample
cp "$MISPCLIENT_ORIGINAL_FILE" "$MISPCLIENT_COPY_FILE"

# Add the Auth Key to the .env file where MISP_API_KEY is located
sed -i "${MISPCLIENT_TARGET_LINE1}s|\(${MISPCLIENT_KEY_WORD1} *\).*|\1$CLAVE|" "$MISPCLIENT_COPY_FILE"

echo -e "\nMISP Client .env file has been created"
echo "✅ Line $MISPCLIENT_TARGET_LINE1 updated in '$MISPCLIENT_COPY_FILE'."

# Add the URL to the .env file where MISP_API_URL is located
sed -i "${MISPCLIENT_TARGET_LINE2}s|\(${MISPCLIENT_KEY_WORD2} *\).*|\1$mispserver_url|" "$MISPCLIENT_COPY_FILE"

echo "✅ Line $MISPCLIENT_TARGET_LINE2 updated in '$MISPCLIENT_COPY_FILE'."

#### END MISP CLIENT CONFIGURATION  ########

####################################################
####      VECTOR ENVIRONMENT CONFIGURATION      ####
####################################################

echo -e "\n\nLet's continue configuring Vector!"
read -t 2

VECTOR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/Vector/.env.sample"
VECTOR_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/Vector/.env"
VECTOR_TARGET_LINE=2
VECTOR_KEY_WORD="RSYSLOG_HOST=" # keep the text and add the WAZUH MANAGER IP behind

# Check if the file exists
if [ ! -f "$VECTOR_ORIGINAL_FILE" ]; then
  echo "❌ The file '$VECTOR_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$VECTOR_ORIGINAL_FILE" "$VECTOR_COPY_FILE"

# Add the Wazuh manager container IP to the .env file where RSYSLOG_HOST is located
sed -i "${VECTOR_TARGET_LINE}s|\(${VECTOR_KEY_WORD} *\).*|\1$WAZUH_IP|" "$VECTOR_COPY_FILE"

echo -e "\nVector .env file has been created"
echo "✅ Line $VECTOR_TARGET_LINE updated in '$VECTOR_COPY_FILE'."
read -t 2

####### END VECTOR CONFIGURATION  ##########


####################################################
####    ENRICHMENT ENVIRONMENT CONFIGURATION    ####
####################################################

echo -e "\nLet's continue configuring Enrichment!"
read -t 2

ENRICHMENT_ORIGINAL_FILE="$DOCKER_BASE_PATH/Aggregation/Enrichment/.env.sample"
ENRICHMENT_COPY_FILE="$DOCKER_BASE_PATH/Aggregation/Enrichment/.env"
ENRICHMENT_TARGET_LINE=15
ENRICHMENT_KEY_WORD="API_KEY=" # keep the text and add the WAZUH MANAGER IP behind

# Check if the file exists
if [ ! -f "$ENRICHMENT_ORIGINAL_FILE" ]; then
  echo "❌ The file '$ENRICHMENT_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Introduce silenpush API Key
echo -e "\nPlease, introduce the Silenpush API Key requested to Maja Otic (motic@silentpush.com):"
read enrich_key

# Create .env file from .env.sample
cp "$ENRICHMENT_ORIGINAL_FILE" "$ENRICHMENT_COPY_FILE"

# Add the Wazuh manager container IP to the .env file where RSYSLOG_HOST is located
sed -i "${ENRICHMENT_TARGET_LINE}s|\(${ENRICHMENT_KEY_WORD} *\).*|\1$enrich_key|" "$ENRICHMENT_COPY_FILE"

echo -e "\nEnrichment .env file has been created"
echo "✅ Line $ENRICHMENT_TARGET_LINE updated in '$ENRICHMENT_COPY_FILE'."
echo "✅ Aggregation Plane has been configured."
read -t 2

####### END ENRICHMENT CONFIGURATION  ##########


#################################################################################################################################################################
#                                               SECURITY OPERATIONS PLANE                                                                                       #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Security Operations Plane!"
read -t 2
echo -e "\nStarting with Playbooks Tool component configuration..."


####### WORKFLOW ORCHESTRATOR CONFIGURATION ############

# No preconfiguration needed.

####### END WORKFLOW ORCHESTRATOR CONFIGURATION ############

####### PLAYBOOKS TOOL CONFIGURATION ############

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
read -t 2

####### END PLAYBOOKS TOOL CONFIGURATION ############

####### MITIGATION MANAGER CONFIGURATION ############

echo -e "\nLet's continue with Mitigation Manager component configuration..."
read -t 2
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
read -t 2

echo -e "\nSecurity Operations Plane has been now deployed"
read -t 2

#################################################################################################################################################################
#                                               SITUATION ASSESSMENT PLANE                                                                                      #
#################################################################################################################################################################
echo -e "\nLet's start with configuring components in Situation Assessment Plane!"
echo -e "\nStarting with CASM component configuration..."
read -t 2
echo -e "\nInstalling python3-poetry to create the venv and install all dependencies"
sudo apt install python3-poetry -y

echo -e "\nCreating the virtual environment and install all dependencies..."
read -t 2

sudo apt remove npm nodejs
sudo apt autoremove
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

sudo apt install nodejs ng-common -y
echo -e "\n✅ Nodejs and npm installed."

echo -e "\nStarting with NSE component configuration..."
read -t 2

echo -e "\nCreating NSE .env file..."
read -t 2

NSE_FILE=.env

cat <<EOF >"$NSE_FILE"
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=supertestovaciheslo
OS_HOST=https://${SERVER_IP}:9200
OS_USER=admin
OS_PASSWORD=admin
OS_INDEX=wazuh-alerts-*
EOF

echo -e "\n✅ .env file has been created."
read -t 2
echo -e "\nLet's start with SACD component configuration..."
read -t 2

SACD_ENV_PRODTS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.prod.ts"
SACD_ENV_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.ts"

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


# Add the Server IP fl_agent.conf and ai_detection_engine.conf files where Server IP should be allocated
sed -i "s/127\.0\.0\.1/${SERVER_IP}/g" "$SACD_ENV_PRODTS_FILE"
sed -i "s/127\.0\.0\.1/${SERVER_IP}/g" "$SACD_ENV_FILE"

echo -e "\n✅ Server IP added for environment.ts and environment.prod.ts config files."
read -t 2

#########   NETWORK AND DETECTION RESPONSE   ################
echo -e "\nLet's start with Network and Detection Response..."
read -t 2

git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response fetch --tags --force
LATEST_TAG=$(git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response describe --tags "$(git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response rev-list --tags --max-count=1)")
git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response checkout "$LATEST_TAG"
read -t 2

# Create and edit the .env file (see env.example)
NDR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example"
NDR_COPY_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"

# Check if the file exists
if [ ! -f "$NDR_ORIGINAL_FILE" ]; then
  echo "❌ The file '$NDR_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$NDR_ORIGINAL_FILE" "$NDR_COPY_FILE"

echo -e "\n✅ File .env created."

##############################################################################
#                           THREAT AWARENESS PLANE                           #                                                               #
##############################################################################
echo -e "\nLet's start with configuring components in Threat Awareness Plane!"
echo -e "\nStarting with Federated Learning component configuration..."
read -t 2

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
sed -i "s/155\.54\.205\.196/${SERVER_IP}/g" "$FLAD_AGENT_ORIGINAL_FILE"
sed -i "s/155\.54\.205\.196/${SERVER_IP}/g" "$FLAD_AGENT_ORIGINAL_FILE2"

echo -e "\n✅ Server IP added for FL_Agent and AI_Detection_Engine config files."
read -t 2

#Build ai-detection-engine component
#docker build -t ai-detection-engine -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/ai-detection-engine/Dockerfile Docker-Compos>

#Build fl-aggregator component
#docker build -t fl-aggregator -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-aggregator/Dockerfile $DOCKER_BASE_PATH/Threat-Awa>

#Build fl-agent component
#docker build -t fl-agent -f $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent/Dockerfile $DOCKER_BASE_PATH/Threat-Awareness/Ano>

#Executing the components
#docker run -p "9998:9998" -d $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/ai-detection-engine/ai-detection-engine
#docker run -p "9999:9999" -d $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-aggregator/fl-aggregator
#docker run -d $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent/fl-agent

#### Add ssh connection to the second server where a new agent need to be deployed in #####
#echo "A second Federated Learning Agent needs to be deployed in another server, please go there and deploy it"
#echo "Follow the next steps:"
#echo "1. Copy the $DOCKER_BASE_PATH/Threat-Awareness/Anomaly-Detectors/UMU-T4.3-FL-Anomaly-Detection/fl-agent folder to the new server"
#echo "2. Build the agent image and run it using the these commands: docker build -t fl-agent / docker run -d fl-agent"

####### END FEDERATED LEARNING CONFIGURATION  ##########

#######   IoB Configuration  ###########################

echo -e "\nLet's continue with IoB component configuration..."
read -t 2

IOB_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env.example"
IOB_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"

# Check if the file exists
if [ ! -f "$IOB_ORIGINAL_FILE" ]; then
  echo "❌ The file '$IOB_ORIGINAL_FILE' do not exist."
  exit 1
fi

# Create .env file from .env.example
cp "$IOB_ORIGINAL_FILE" "$IOB_COPY_FILE"

echo -e "\n✅ File .env created."
read -t 2

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

# echo -e "\nLet's continue with PP-CTI component configuration..."

# echo -e "\nInstalling Java dependencies...\n"

# sudo apt update
# sudo apt install openjdk-21-jdk -y

# echo -e "\n✅ Java 21 (OpenJDK 21) installed.\n"

# docker build ./$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/flaskdp

# echo -e "\n✅ FlaskDP image built.\n"

# ./$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/arxlet/gradlew -p $DOCKER_BASE_PATH/Threat-Awareness/PP-CTI/arxlet server:dockerImage

# echo -e "\n✅ ARXlet image built.\n"

#######   END PP-CTI Configuration   #######################


##################################################################################
#                     COMPOSE FILES EXECUTION                                    #
##################################################################################

# echo -e "\nEnter to start docker compose build..."
# read

# docker compose -f $DOCKER_BASE_PATH/Dockerfile build

echo -e "\nEnter to start main docker compose up..."
read
docker compose -f $DOCKER_BASE_PATH/docker-compose.yml up -d

#################################################################################
#                     CONFIGURATION WAZUH DOCKER CONTAINER                      #
#################################################################################

CONTAINER="ResilMesh-Wazuh-Manager"
echo -e "\nStarting Wazuh Manager container configuration..."
read -t 2
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
read -t 2
##############  END WAZUH CONTAINER CONFIGURATION  ###############################################

# Test data injection from Vector to Wazuh Manager to test rsyslog
echo -e "\nInjecting test data from Vector to test rsyslog configuration..."
read -t 5
docker exec -u 0 Vector bash -c 'tail -n50 /etc/vector/datasets/CESNET/bad_ips.csv >> /etc/vector/datasets/CESNET/bad_ips.csv'

echo -e "\nData already inyected."

######### NSE SERVICE EXECUTION  ################################################################
# echo -e "\nStarting NSE Service..."
# read -t 2
# npm --prefix $DOCKER_BASE_PATH/Situation-Assessment/NSE/ i
# npm --prefix $DOCKER_BASE_PATH/Situation-Assessment/NSE/ start &

# echo -e "\nNSE Service running."
# read -t 2
#############  FINAL SUMMARY  ###################################################################
if [[ "$Cloud" == "Amazon EC2"]]; then
    SERVER_IP=$SERVER_IP_PUBLIC
fi
echo -e "\nA new file output_summary.txt has been created with a summary of the changes.\n"

cat << EOF > ./output_summary.txt

This is a summary of all the changes made during the execution:
- resilmesh_network has been created: IP 172.19.0.0
- resilmesh_network_misp has been created: IP 172.20.0.0
- Environment files created for Wazuh Server, Misp Server, Vector, Enrichment, Misp Client, Mitigation Manager,\n PBTools, SACD and NSE.
- Your have entered SLP key: $enrich_key
- MISP Server Authkey autogenerated: $CLAVE

Below you can find the URLs to access the services:
- The component MISP Server is accessible on: $mispserver_url
- The component Wazuh Server is accesible on: http://$SERVER_IP:4433
- The component ISIM (neo4j) is accesible on: http://$SERVER_IP:7474
- The component Workflow Orchestrator (Temporal) is accesible on: http://$SERVER_IP:8080
- The component ISIM Graphql is accesible on: http://$SERVER_IP:4001/graphql
- The component SACD is accesible on: http://$SERVER_IP:4200
- The component CASM is accesible on: http://$SERVER_IP:8000
- The component NDR is accesible on: http://$SERVER_IP:3000"
- The component Playbooks Tool (Shuffle) is accesible on: http://$SERVER_IP:3443
- The component NSE Angular frontend is accesible on: http://$SERVER_IP:4201
- The component NSE Flask Risk API is accesible on: http://$SERVER_IP:5000
- The component IoB Attack Flow Builder is accesible on: http://$SERVER_IP:9080
- The component IoB Sanic Web Server is accesible on: http://$SERVER_IP:9003
- The component IoB STIX Modeler is accesible on: http://$SERVER_IP:3400
- The component IoB CTI STIX Visualization is accesible on: http://$SERVER_IP:9003/cti-stix-visualization/index.html

EOF