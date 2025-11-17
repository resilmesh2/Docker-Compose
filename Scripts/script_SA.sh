#################################################################################################################################################################
#                                                                                                                                                               #
#                                               SITUATION ASSESSMENT PLANE                                                                                      #
#                                                                                                                                                               #
#################################################################################################################################################################
#!/bin/bash
DOCKER_BASE_PATH=".."

echo -e "\nLet's start with configuring components in Situation Assessment Plane!"
echo -e "\nNo configuration needed for ISIM component."
echo -e "\nPress enter to start with CASM component configuration..."
read
echo -e "\nInstalling python3-poetry to create the venv and install all dependencies"
sudo apt install python3-poetry

echo -e "\nNo configuration needed for CSA component. Enter to continue..."
read
echo -e "\nPress enter to start with NSE component configuration..."
npm --prefix $DOCKER_BASE_PATH/Situation-Assessment/NSE/ i
npm --prefix $DOCKER_BASE_PATH/Situation-Assessment/NSE/ start &
read

echo -e "\n Press enter to create .env file..."
NSE_FILE=.env

cat <<EOF >"NSE_FILE"
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=supertestovaciheslo
OS_HOST=https://${SERVER_IP}:9200
OS_USER=admin
OS_PASSWORD=admin
OS_INDEX=wazuh-alerts-*
EOF

echo -e "\n✅ .env file has been created. Enter to continue..."
read
echo -e "\nPress enter to start with SACD component configuration..."
read

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

ng server       # to run the dashboard
read

#NDR FALTA.


# Compose up
docker compose -f $DOCKER_BASE_PATH/Situation-Assessment/NSE/docker-compose.yml build
docker compose -f $DOCKER_BASE_PATH/Situation-Assessment/docker-compose.yml up

docker build -t resilmesh-landing-page .
docker run -p 8181:8181 resilmesh-landing-page
