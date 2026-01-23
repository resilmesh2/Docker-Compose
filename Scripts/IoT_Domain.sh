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
      sleep 2
      read_api_key "Alias"
      break
      ;;
    2)
      echo -e "\nYou have selected: Claude Sonnet 4"
      sleep 2
      read_api_key "Claude Sonnet 4"
      break
      ;;
    3)
      echo -e "\nYou have selected: Other"
      sleep 2
      echo -e "\nPlease, introduce the model:"  
      read model_dfir
      read_api_key "$model_dfir"
      break
      ;;
    *)
      echo -e "\n❌ Invalid option. Please, try again with a number between 1 to 3."
      sleep 2
      ;;
  esac

done

if [ "$option" == "2" ]; then
  api_key_thframe="$api_key_dfir"
  echo -e "\n\nUsing the same API Key for THFramework."
else
  echo -e "\n\nPlease, introduce the API Key for THFramework:"
  read api_key_thframe
fi

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


#################################################################################################################################################################
#                                               AGGREGATION PLANE                                                                                               #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Aggregation Plane!\n"

####################################################
####      MISP CLIENT CONFIGURATION      ###########
####################################################

#Out of scope for IOT.

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

#No components from Security Operations Plane are included in IOT.

#################################################################################################################################################################
#                                               SITUATION ASSESSMENT PLANE                                                                                      #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Situation Assessment Plane!\n"

#################### CASM #################

#Out of scope for IOT.

#################### ISIM #################

#Out of scope for IOT.

##################### NSE #################

#Out of scope for IOT.

################### SACD ################

#Out of scope for IOT.

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

#Out of scope for IOT.

####### END FEDERATED LEARNING CONFIGURATION  ##########

#######   IoB Configuration  ###########################

#Out of scope for IOT.

#######   END IoB Configuration  ###########################


#######   PP-CTI Configuration   ###########################

#Out of scope for IOT.

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

sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$api_key_thframe|" "$THF_ORIGINAL_FILE"

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
docker compose -f $DOCKER_BASE_PATH/docker-compose-IoT_Domain.yml up -d


############################  END COMPOSE FILES EXECUTION  ############################


#################################################################################
#                     CONFIGURATION WAZUH DOCKER CONTAINER                      #
#################################################################################

CONTAINER="resilmesh.tap.wazuh.manager"
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
############################  END WAZUH CONTAINER CONFIGURATION  ############################


# Test data injection from Vector to Wazuh Manager to test rsyslog
echo -e "\nInjecting test data from Vector to test rsyslog configuration..."
read -t 5
docker exec -u 0 resilmesh-ap-vector bash -c 'tail -n50 /etc/vector/datasets/CESNET/bad_ips.csv >> /etc/vector/datasets/CESNET/bad_ips.csv'

echo -e "\nData already inyected."


############################  FINAL SUMMARY  ############################

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
echo -e "- Environment files created for Wazuh Server, Vector and NDR."
echo -e "- You have entered the DFIR API key: $api_key_dfir"
echo -e "- You have entered the THFramework Anthropic API key: $api_key_thframe"
echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."


echo -e "\nBelow you can find the URLs to access the services:\n"
echo -e "- The component Wazuh Server is accesible on: https://$SERVER_IP:4433"
echo -e "- The component Landing Page is accesible on: http://$SERVER_IP:8181"
echo -e "- The component NDR is accesible on: http://$SERVER_IP:3000"
echo -e "- The component DFIR is accesible on: http://$SERVER_IP:5005"
echo -e "- The component THF is accesible on: http://$SERVER_IP:8501"

echo -e "\n\nA new file output_summary.txt has been created with a summary of the changes.\n"


# Create output_summary.txt file with the summary of changes
{
    echo -e "\nThis is a summary of all the changes made during the execution:\n"
    echo -e "- resilmesh_network has been created: IP 172.19.0.0/16"
    echo -e "- Environment files created for Wazuh Server, Vector and NDR."
    echo -e "- You have entered the DFIR API key: $api_key_dfir"
    echo -e "- You have entered the THFramework Anthropic API key: $api_key_thframe"
    echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."

    SEPARATOR="+----------------------+----------------------------+----------+-----------------+-------+----------------------------------------------------------------+"

    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+\n"
    printf "|                                                          Components                                                                                     |\n"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Plane" "Service" "Protocol" "IP Address" "Port" "URL"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "Landing page" "HTTP" "$SERVER_IP" "8181" "http://$SERVER_IP:8181"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "Wazuh Server" "HTTPS" "$SERVER_IP" "4433" "https://$SERVER_IP:4433"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "NDR" "HTTP" "$SERVER_IP" "3000" "http://$SERVER_IP:3000"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "DFIR" "HTTP" "$SERVER_IP" "5000" "http://$SERVER_IP:5005"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "THF" "HTTP" "$SERVER_IP" "8501" "http://$SERVER_IP:8501"
    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+"
    printf "\n\n"
} > ./output_summary.txt