#################################################
#####     Resilmesh network creation    #########
#################################################
#!/bin/bash
DOCKER_BASE_PATH=".."

echo "The first step of the deployment is creating the resilmesh network where all components will run."
echo "Enter to start..."
read

docker network create \
  --driver bridge \
  --subnet 172.19.0.0/16 \
  --gateway 172.19.0.1 \
  resilmesh_network

echo -e "You can see the network from the following list\n"
docker network ls

echo -e "\nThe network resilmesh_network has been created with subnet 172.19.0.0/16. Press enter to continue with the deployment..."
read

#### END NETWORK CREATION  ########

##################################################
####    WAZUH ENVIRONMENT CONFIGURATION   ########
##################################################

echo -e "\nLet's continue configuring Wazuh Server!. Press enter to continue..."
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

echo -e "Please select an IP to configure wazuh manager inside resilmesh_network, example: 172.19.0.100"
docker network inspect resilmesh_network | grep "Subnet"

echo -e "\nEnter the IP and press enter:"
read WAZUH_IP

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

echo "Certificates generated correctly. Press Enter to continue with the process..."
read

# Remove lingering container
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-certs.yaml down --remove-orphans

# Generating server configuration files
docker compose --file $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose-original.yaml up -d

echo "Server configuration files generated correctly. Press Enter to continue with the process..."
read

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

echo -e "\nLet's start deploying wazuh containers. Enter to start..."
read
docker compose -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/compose.yaml up --build -d


####### END WAZUH CONFIGURATION  ##########

######################################################################################################################################
#                                                                                                                                    #
#                                               CONFIGURATION WAZUH DOCKER CONTAINER                                                 #
#                                                                                                                                    #
######################################################################################################################################

echo -e "\nPress enter to start configuring wazuh manager container, Rsyslogd and log files..."
read

CONTAINER="ResilMesh-Wazuh-Manager"

echo -e "\nUpdating repositories in the $CONTAINER..."
docker exec -u 0 -it "$CONTAINER" yum update -y
read

echo -e "\nInstalling telnet in the $CONTAINER..."
docker exec -u 0 -it "$CONTAINER" yum install -y telnet
read

echo -e "\nInstalling rsyslog in the $CONTAINER..."
docker exec -u 0 -it "$CONTAINER" yum install -y rsyslog
read

echo -e "\nInstalling nano in the $CONTAINER..."
docker exec -u 0 -it "$CONTAINER" yum install -y nano
read

echo -e "\nCreating Resilmesh.conf and adding the content to it in the $CONTAINER..."
#docker exec -u 0 -it "$CONTAINER" nano /etc/rsyslog.d/Resilmesh.conf
read

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
read

docker exec -u 0 "$CONTAINER" rsyslogd
echo -e "\nReady."

##############  END WAZUH CONTAINER CONFIGURATION  ###############################################

