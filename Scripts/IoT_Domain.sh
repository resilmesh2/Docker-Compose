#!/bin/bash

#######################################################
#                   VARIABLES                         #
#######################################################

DOCKER_BASE_PATH=".."

#######################################################
#                IP'S COLLECTION                      #
#######################################################
Cloud=$(cat /sys/class/dmi/id/sys_vendor)
SERVER_IP=$(hostname -i)
if [[ "$Cloud" == "Amazon EC2" ]]; then
    SERVER_IP_PUBLIC=$(curl -s https://checkip.amazonaws.com)
    mispserver_url="https://${SERVER_IP_PUBLIC}:10443"
    echo -e "\nYour Public IP is: '$SERVER_IP_PUBLIC' and your Private IP is: '$SERVER_IP'"
else
    mispserver_url="https://${SERVER_IP}:10443"
    echo -e "\nYour Private IP is: '$SERVER_IP'\n"
fi
read -t 3



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

echo -e "\nLet's start building wazuh containers."
read -t 2
# docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml up --build -d
docker build -f "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/Dockerfile" "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker"
read -t 2
# docker compose -f "$DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml" up -d

# echo -e "\nWazuh has been already deployed."
# read -t 2

####### END WAZUH CONFIGURATION  ##########



#################################################################################################################################################################
#                                               AGGREGATION PLANE                                                                                               #
#################################################################################################################################################################

echo -e "\nLet's start with configuring components in Aggregation Plane!"
read -t 2

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



#################################################################################################################################################################
#                                               SITUATION ASSESSMENT PLANE                                                                                      #
#################################################################################################################################################################
echo -e "\nLet's start with configuring components in Situation Assessment Plane!"
read -t 2

#########   NETWORK AND DETECTION RESPONSE (NDR)   ################
echo -e "\nLet's start with Network and Detection Response..."
read -t 2

# git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response fetch --tags --force
# LATEST_TAG=$(git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response describe --tags "$(git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response rev-list --tags --max-count=1)")
# git -C $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response checkout "$LATEST_TAG"
# read -t 2

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

###########   LANDING PAGE CONFIGURATION  ####################################
  
sed -i 's/localhost/'"$SERVER_IP"'/g' "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json"

echo -e "\n✅ All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."

###########   END LANDING PAGE CONFIGURATION  ################################



##############################################################################
#                           THREAT AWARENESS PLANE                           #                                                               
##############################################################################
echo -e "\nLet's start with configuring components in Threat Awareness Plane!"
read -t 2

####### AI BASED DETECTOR CONFIGURATION  ##########
echo -e "\nStarting with AI Based Detector component configuration..."
read -t 2
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
read -t 2
####### END AI BASED DETECTOR CONFIGURATION  ##########



##################################################################################
#                     COMPOSE FILES EXECUTION                                    #
##################################################################################

# echo -e "\nEnter to start docker compose build..."
# read

# docker compose -f $DOCKER_BASE_PATH/Dockerfile build

echo -e "\nEnter to start main docker compose up..."
read
docker compose -f $DOCKER_BASE_PATH/docker-compose-IoT_Domain.yml up -d



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
read -t 2



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
echo -e "- Environment files created for Wazuh Server and Vector."
echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."


echo -e "\nBelow you can find the URLs to access the services:\n"
echo -e "- The component Wazuh Server is accesible on: https://$SERVER_IP:4433"
echo -e "- The component Landing Page is accesible on: http://$SERVER_IP:8181"
echo -e "- The component NDR is accesible on: http://$SERVER_IP:3000"
echo -e "- The component Threat Hunting and Forensics (DFIR) is accesible on: http://$SERVER_IP:5000"

echo -e "\n\nA new file output_summary.txt has been created with a summary of the changes.\n"


# Create output_summary.txt file with the summary of changes
{
    echo -e "\nThis is a summary of all the changes made during the execution:\n"
    echo -e "- resilmesh_network has been created: IP 172.19.0.0/16"
    echo -e "- Environment files created for Wazuh Server and Vector."
    echo -e "- All landing page services URLs have been configured from 'localhost' to '$SERVER_IP' in the file /Landing-Page/src/data/entries.json."

    SEPARATOR="+----------------------+----------------------------+----------+-----------------+-------+----------------------------------------------------------------+"

    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+\n"
    printf "|                                                          Components                                                                                     |\n"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Plane" "Service" "Protocol" "IP Address" "Port" "URL"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "Wazuh Server" "HTTPS" "$SERVER_IP" "4433" "https://$SERVER_IP:4433"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "Landing page" "HTTP" "$SERVER_IP" "8181" "http://$SERVER_IP:8181"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Situation Assessment" "NDR" "HTTP" "$SERVER_IP" "3000" "http://$SERVER_IP:3000"
    printf "$SEPARATOR\n"
    printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |\n" "Threat Awareness" "THF (DFIR)" "HTTP" "$SERVER_IP" "5000" "http://$SERVER_IP:5000"
    printf "+---------------------------------------------------------------------------------------------------------------------------------------------------------+"
    printf "\n\n"
} > ./output_summary.txt
