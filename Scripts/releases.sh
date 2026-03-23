#!/bin/bash

######################################################
#                         MAIN                       #  
######################################################

################       Variables      ################
 
DOCKER_BASE_PATH=".."

declare -A SERVICES=(
    ["Aggregation_Enrichment"]="resilmesh-ap-silentpush"
    ["Aggregation_MISP-Client"]="resilmesh-ap-misp-client"
    ["Aggregation_NATS"]="resilmesh-ap-nats"
    ["Aggregation_Vector"]="resilmesh-ap-vector"
    ["Security-Operations_Mitigation-Manager"]="resilmesh-sop-mm"
    ["Security-Operations_Playbooks-Tool"]="resilmesh-sop-pt-frontend resilmesh-sop-pt resilmesh-sop-pt-orborus resilmesh-sop-pt-opensearch"
    ["Security-Operations_Workflow-Orchestrator"]="resilmesh-sop-wo-elasticsearch resilmesh-sop-wo-postgresql resilmesh-sop-wo-temporal resilmesh-sop-wo-temporal-admin-tools resilmesh-sop-wo-temporal-ui"
    ["Situation-Assessment_CASM"]="resilmesh-sap-casm-postgres resilmesh-sap-casm-component-calculation-worker resilmesh-sap-casm-worker resilmesh-sap-casm-metasploitable3 resilmesh-sap-casm-component-scheduler-worker resilmesh-sap-casm-nmap-worker resilmesh-sap-casm-cve-connector-worker resilmesh-sap-casm-slp-enrichment-worker"
    ["Situation-Assessment_CSA"]="resilmesh-sap-csa-worker"
    ["Situation-Assessment_ISIM"]="resilmesh-sap-isim resilmesh-sap-isim-graphql resilmesh-sap-isim-automation resilmesh-sap-neo4j"
    ["Situation-Assessment_Landing-Page"]="resilmesh-sap-landing-page"
    ["Situation-Assessment_NSE"]="resilmesh-sap-nse-backend resilmesh-sap-nse-frontend"
    ["Situation-Assessment_Network-Detection-Response"]="resilmesh-sap-ndr-server resilmesh-sap-ndr-client"
    ["Situation-Assessment_SACD"]="resilmesh-sap-sacd"
    ["Threat-Awareness_AI-Based-Detector"]="resilmesh-tap-ai-ad"
    ["Threat-Awareness_IoB"]="resilmesh-tap-attackflow-builder resilmesh-tap-sanic-web-server resilmesh-tap-stix-modeler"
    ["Threat-Awareness_MISP-Server"]="resilmesh-tap-misp-mail resilmesh-tap-misp-db resilmesh-tap-misp-core resilmesh-tap-misp-modules resilmesh-tap-misp-guard"
    ["Threat-Awareness_Wazuh"]="resilmesh.tap.wazuh.manager resilmesh.tap.wazuh.indexer resilmesh.tap.wazuh.dashboard"
    ["Threat-Awareness_Threat-Hunting-And-Forensics_DFIR"]="resilmesh-tap-dfir-cai-framework"
    ["Threat-Awareness_Threat-Hunting-And-Forensics_THF"]="resilmesh-tap-thf"
)

declare -A SUBMODULES=(
    ["Aggregation_Enrichment"]="Aggregation Enrichment"
    ["Aggregation_MISP-Client"]="Aggregation MISP_client"
    ["Aggregation_NATS"]="Aggregation NATS"
    ["Aggregation_Vector"]="Aggregation Vector"
    ["Security-Operations_Mitigation-Manager"]="Security-Operations Mitigation-manager"
    ["Security-Operations_Playbooks-Tool"]="Security-Operations Playbooks-tool"
    ["Security-Operations_Workflow-Orchestrator"]="Security-Operations Workflow-Orchestrator"
    ["Situation-Assessment_CASM"]="Situation-Assessment CASM"
    ["Situation-Assessment_CSA"]="Situation-Assessment CSA"
    ["Situation-Assessment_ISIM"]="Situation-Assessment ISIM"
    ["Situation-Assessment_Landing-Page"]="Situation-Assessment Landing-Page"
    ["Situation-Assessment_NSE"]="Situation-Assessment NSE"
    ["Situation-Assessment_Network-Detection-Response"]="Situation-Assessment Network-Detection-Response"
    ["Situation-Assessment_SACD"]="Situation-Assessment SACD"
    ["Threat-Awareness_AI-Based-Detector"]="Threat-Awareness AI_Based_Detector"
    ["Threat-Awareness_IoB"]="Threat-Awareness IoB"
    ["Threat-Awareness_MISP-Server"]="Threat-Awareness MISP_Server-docker"
    ["Threat-Awareness_Wazuh"]="Threat-Awareness wazuh-docker"
    ["Threat-Awareness_Threat-Hunting-And-Forensics_DFIR"]="Threat-Awareness Threat-Hunting-And-Forensics DFIR"
    ["Threat-Awareness_Threat-Hunting-And-Forensics_THF"]="Threat-Awareness Threat-Hunting-And-Forensics THF"
)

declare -A DEPLOYMENTS=(
    ["IT_Domain"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_NSE Situation-Assessment_Network-Detection-Response Situation-Assessment_SACD Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF"
    ["IoT_Domain"]="Aggregation_Enrichment Aggregation_NATS Aggregation_Vector Situation-Assessment_Landing-Page Situation-Assessment_Network-Detection-Response Threat-Awareness_AI-Based-Detector Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF"
    ["Domain"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Mitigation-Manager Security-Operations_Playbooks-Tool Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_CSA Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_SACD Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh"
    ["Full_Platform"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Mitigation-Manager Security-Operations_Playbooks-Tool Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_CSA Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_NSE Situation-Assessment_Network-Detection-Response Situation-Assessment_SACD Threat-Awareness_AI-Based-Detector Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF"
)

menu() {
  echo
  echo "1) IT Domain (ICERT)"
  echo "2) IoT Domain (ALIAS)"
  echo "3) Domain (CARM)"
  echo "4) Full Platform"
  echo "5) Exit"
  echo
  read -p "Enter the number of your choice (1-5): " option
}

############### Check for new versions ###############
                                    
git fetch --tags -q
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null)                                               
LATEST_VERSION=$(git tag -l "v[0-9]*.[0-9]*.0" --sort=-v:refname | head -n 1)

if [ "$CURRENT_VERSION" == "$LATEST_VERSION" ]; then
    echo -e "\n✅ The system is already up to date with the latest version ($LATEST_VERSION). Nothing to do.\n"
    exit 0
fi

git checkout "$LATEST_VERSION" -q
echo -e "\n🚀 New version detected: Updating from $CURRENT_VERSION to $LATEST_VERSION\n"

###############          Menu          ###############

echo -e "\n---------- ResilMesh Update Manager ----------\n"
echo -e "Select your target environment to continue the update process:"

while true; do
  menu

  case $option in
    1)
      echo -e "\n\nProceeding with IT Domain deployment...\n"
      DEPLOYMENT="IT_Domain"
      COMPOSE_FILE="../docker-compose-IT_Domain.yml"
      break
      ;;
    2)
      echo -e "\n\nProceeding with IoT Domain deployment...\n"
      DEPLOYMENT="IoT_Domain"
      COMPOSE_FILE="../docker-compose-IoT_Domain.yml"
      break
      ;;
    3)
      echo -e "\n\nProceeding with Domain deployment...\n"
      DEPLOYMENT="Domain"
      COMPOSE_FILE="../docker-compose-Domain.yml"
      break
      ;;
    4)
      echo -e "\n\nProceeding with Full Platform deployment...\n"
      DEPLOYMENT="Full_Platform"
      COMPOSE_FILE="../docker-compose-Full_Platform.yml"
      break
      ;;
    5)
      echo -e "\n\nExiting...\n"
      exit 0
      ;;
    *)
      echo -e "\n❌ Invalid option. Please, try again with a number between 1 to 5."
      ;;
  esac

done
 
################      IP Addresses    ################

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


######################################################
#                  RELEASE V2.1.0                    #  
######################################################

if [ "$CURRENT_VERSION" == "v2.0.0" ]; then

    VERSION_UPDATES=(
        "Situation-Assessment_Network-Detection-Response"
        "Threat-Awareness_IoB"
    )

    COMPONENTS_TO_UPDATE=()
    DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "

    for comp in "${VERSION_UPDATES[@]}"; do
        if [[ "$DEPLOYMENT_LIST" == *" $comp "* ]]; then
            COMPONENTS_TO_UPDATE+=("$comp")
        fi
    done

    if [ ${#COMPONENTS_TO_UPDATE[@]} -gt 0 ]; then

        echo -e "\n🔄 Updating submodules...\n"
        for component in "${COMPONENTS_TO_UPDATE[@]}"; do
            levels=(${SUBMODULES[$component]})
            current_path="$DOCKER_BASE_PATH"
            
            for level in "${levels[@]}"; do
                git -C "$current_path" submodule update --init --force "$level"
                current_path="$current_path/$level"
            done
        done

        ################  IoB Configuration   ################

        if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_IoB "* ]]; then

            echo -e "\nLet's continue with IoB component configuration...\n"

            read -p "Do you want to share IoBs with someone? (y/n): " answer_iob1
            if [[ "$answer_iob1" == "y" || "$answer_iob1" == "Y" ]]; then
                read -p "\nIntroduce your peer's URL (<IP>:<PORT>):\n " peer_url
                IOB_PEER_URL="http://${peer_url}"
                echo -e "\nPeer URL saved: $IOB_PEER_URL"
            else
                echo -e "\nYou said that you don't want to share IoBs.\n"
            fi

            read -p "Do you want to receive the IoBs? (y/n): " answer_iob2
            if [[ "$answer_iob2" == "y" || "$answer_iob2" == "Y" ]]; then
                IOB_PEER_AUTH_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 40)
                echo -e "\nPeer Auth Token autogenerated: $IOB_PEER_AUTH_TOKEN"
            else
                echo -e "\nYou said that you don't want to receive IoBs.\n"
            fi
            
            IOB_ORIGINAL_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env.example"
            IOB_COPY_FILE="$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"
            IOB_INTEGRATIONS="$DOCKER_BASE_PATH/Threat-Awareness/IoB/attack_flow_builder/src/components/Elements/IntegrationToolsDialog.vue"
            
            # Check if the file exists
            if [ ! -f "$IOB_ORIGINAL_FILE" ]; then
                echo -e "\n❌ The file '$IOB_ORIGINAL_FILE' do not exist.\n"
                exit 1
            fi
            
            # Create .env file from .env.example
            cp "$IOB_ORIGINAL_FILE" "$IOB_COPY_FILE"
            
            echo -e "\n✅ File .env created.\n"

            # Add PEER_URL and PEER_AUTH_TOKEN to the .env file where they are located
            if [[ "$IOB_PEER_URL" ]]; then
                sed -i "s|PEER_URL=.*|PEER_URL=$IOB_PEER_URL|g" "$IOB_COPY_FILE"
            else
                sed -i "s|PEER_URL=.*|PEER_URL=|g" "$IOB_COPY_FILE"
            fi

            if [[ "$IOB_PEER_AUTH_TOKEN" ]]; then
                sed -i "s|PEER_AUTH_TOKEN=.*|PEER_AUTH_TOKEN=$IOB_PEER_AUTH_TOKEN|g" "$IOB_COPY_FILE"
            else
                sed -i "s|PEER_AUTH_TOKEN=.*|PEER_AUTH_TOKEN=|g" "$IOB_COPY_FILE"
            fi
            
            # Check if the file exists
            if [ ! -f "$IOB_INTEGRATIONS" ]; then
                echo -e "\n❌ The file '$IOB_INTEGRATIONS' do not exist.\n"
                exit 1
            fi
            
            if [[ "$Cloud" == "Amazon EC2" ]]; then
                sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$IOB_INTEGRATIONS"
            else
                sed -i "s|localhost|${SERVER_IP}|g" "$IOB_INTEGRATIONS"
            fi
            
            IOB_APP_PATH="$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app"
            
            if [ ! -d "$IOB_APP_PATH/node_modules" ]; then
                echo -e "\nInstalling npm dependencies for IoB (this may take a while)...\n"
                NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$IOB_APP_PATH" install --legacy-peer-deps
            fi

            NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$IOB_APP_PATH" run build
        
        fi

        ################  NDR Configuration   ################

        if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Network-Detection-Response "* ]]; then

            echo -e "\nLet's start with Network and Detection Response...\n"

            # Create and edit the .env file (see env.example)
            NDR_ORIGINAL_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example"
            NDR_COPY_FILE="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
            
            # Check if the file exists
            if [ ! -f "$NDR_ORIGINAL_FILE" ]; then
                echo -e "\n❌ The file '$NDR_ORIGINAL_FILE' do not exist.\n"
                exit 1 
            fi

            # Create .env file from .env.example
            cp "$NDR_ORIGINAL_FILE" "$NDR_COPY_FILE"
            echo -e "\n✅ File .env created.\n"
            
            if [[ "$Cloud" == "Amazon EC2" ]]; then
                sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NDR_COPY_FILE"
            else
                sed -i "s|localhost|${SERVER_IP}|g" "$NDR_COPY_FILE"
            fi
        
        fi

        ################   Docker Deployment  ################

        SERVICES_TO_BUILD=()

        for component in "${COMPONENTS_TO_UPDATE[@]}"; do
            SERVICES_TO_BUILD+=(${SERVICES[$component]})
        done

        echo -e "\nRebuilding selected services: ${SERVICES_TO_BUILD[*]}...\n"
        
        docker compose -f "$COMPOSE_FILE" up -d --build "${SERVICES_TO_BUILD[@]}"

    fi

fi

echo -e "\n✅ Deployment of $LATEST_VERSION finished successfully.\n"