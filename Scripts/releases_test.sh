#!/bin/bash

######################################################
#                    MAIN                            #
######################################################

DOCKER_BASE_PATH=".."

declare -A SERVICES=(
    ["Aggregation_Enrichment"]="resilmesh-ap-silentpush"
    ["Aggregation_MISP-Client"]="resilmesh-ap-misp-client"
    ["Aggregation_NATS"]="resilmesh-ap-nats"
    ["Aggregation_Vector"]="resilmesh-ap-vector"
    ["Security-Operations_Mitigation-Manager"]="resilmesh-sop-mm"
    ["Security-Operations_Playbooks-Tool"]="resilmesh-sop-pt-frontend resilmesh-sop-pt resilmesh-sop-pt-orborus resilmesh-sop-pt-opensearch"
    ["Security-Operations_Workflow-Orchestrator"]="resilmesh-sop-wo-elasticsearch resilmesh-sop-wo-postgresql resilmesh-sop-wo-temporal resilmesh-sop-wo-temporal-admin-tools resilmesh-sop-wo-temporal-ui"
    ["Situation-Assessment_CASM"]="resilmesh-sap-casm-postgres resilmesh-sap-casm-component-calculation-worker resilmesh-sap-casm-worker resilmesh-sap-casm-metasploitable3 resilmesh-sap-casm-shared-worker resilmesh-sap-casm-cve-connector-worker resilmesh-sap-casm-slp-enrichment-worker"
    ["Situation-Assessment_CSA"]="resilmesh-sap-csa-worker"
    ["Situation-Assessment_ISIM"]="resilmesh-sap-isim resilmesh-sap-isim-graphql resilmesh-sap-isim-automation resilmesh-sap-neo4j resilmesh-sap-isim-nginx"
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
    ["Threat-Awareness_PPCTI"]="arxlet anonymizer context flaskdp frontend nginx backend"
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
    ["Threat-Awareness_PPCTI"]="Threat-Awareness PPCTI"
)

declare -A DEPLOYMENTS=(
    ["IT_Domain"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_NSE Situation-Assessment_Network-Detection-Response Situation-Assessment_SACD Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF Threat-Awareness_PPCTI"
    ["IoT_Domain"]="Aggregation_Enrichment Aggregation_NATS Aggregation_Vector Situation-Assessment_Landing-Page Situation-Assessment_Network-Detection-Response Threat-Awareness_AI-Based-Detector Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF"
    ["Domain"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Mitigation-Manager Security-Operations_Playbooks-Tool Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_CSA Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_SACD Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh Threat-Awareness_PPCTI"
    ["Full_Platform"]="Aggregation_Enrichment Aggregation_MISP-Client Aggregation_NATS Aggregation_Vector Security-Operations_Mitigation-Manager Security-Operations_Playbooks-Tool Security-Operations_Workflow-Orchestrator Situation-Assessment_CASM Situation-Assessment_CSA Situation-Assessment_ISIM Situation-Assessment_Landing-Page Situation-Assessment_NSE Situation-Assessment_Network-Detection-Response Situation-Assessment_SACD Threat-Awareness_AI-Based-Detector Threat-Awareness_IoB Threat-Awareness_MISP-Server Threat-Awareness_Wazuh Threat-Awareness_Threat-Hunting-And-Forensics_DFIR Threat-Awareness_Threat-Hunting-And-Forensics_THF Threat-Awareness_PPCTI"
)

UPDATE_SUMMARY=""

# 1. Obtener etiquetas de Git para conocer el estado actual
git fetch --tags -q
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null)
LATEST_VERSION=$(git tag -l "v[0-9]*.[0-9]*.0" --sort=-v:refname | head -n 1)

echo -e "\n=============================================="
echo -e "  Versión detectada:     \033[1;32m$CURRENT_VERSION\033[0m"
echo -e "  Última tag disponible: \033[1;36m$LATEST_VERSION\033[0m"
echo -e "==============================================\n"

if [ "$CURRENT_VERSION" == "$LATEST_VERSION" ]; then
    echo -e "✅ El sistema ya está actualizado a la versión más reciente ($LATEST_VERSION).\n"
    exit 0
fi

# 2. Menú interactivo de selección de destino objetivo
echo "Selecciona a qué versión deseas actualizar el sistema:"
echo "1) v2.1.0"
echo "2) v2.2.0"
echo "3) v2.3.0 (Última versión)"
echo "4) Salir"
echo
read -p "Introduce una opción (1-4): " target_option

case $target_option in
    1) TARGET_VERSION="v2.1.0" ;;
    2) TARGET_VERSION="v2.2.0" ;;
    3) TARGET_VERSION="v2.3.0" ;;
    *) echo -e "\nCancelado por el usuario o selección incorrecta.\n"; exit 0 ;;
esac

# Extraer cadenas numéricas para blindar la comparación alfabética/ASCII de Bash
VERSION_CUR_NUM="${CURRENT_VERSION#v}"
VERSION_TAR_NUM="${TARGET_VERSION#v}"

if [[ "$VERSION_CUR_NUM" == "$VERSION_TAR_NUM" ]]; then
    echo -e "\n❌ Error: Ya te encuentras en la versión $TARGET_VERSION.\n"
    exit 1
elif [ "$(printf '%s\n' "$VERSION_TAR_NUM" "$VERSION_CUR_NUM" | sort -V | head -n1)" == "$VERSION_TAR_NUM" ]; then
    echo -e "\n❌ Error: No puedes actualizar a la versión $TARGET_VERSION porque tu versión actual es $CURRENT_VERSION.\n"
    exit 1
fi

# 3. Selección del entorno de despliegue
while true; do
  echo -e "\nSelecciona tu entorno de despliegue objetivo:"
  echo "1) IT Domain (ICERT)"
  echo "2) IoT Domain (ALIAS)"
  echo "3) Domain (CARM)"
  echo "4) Full Platform"
  read -p "Opción (1-4): " option

  case $option in
    1) DEPLOYMENT="IT_Domain"; COMPOSE_FILE="../docker-compose-IT_Domain.yml"; break ;;
    2) DEPLOYMENT="IoT_Domain"; COMPOSE_FILE="../docker-compose-IoT_Domain.yml"; break ;;
    3) DEPLOYMENT="Domain"; COMPOSE_FILE="../docker-compose-Domain.yml"; break ;;
    4) DEPLOYMENT="Full_Platform"; COMPOSE_FILE="../docker-compose-Full_Platform.yml"; break ;;
    *) echo -e "\n❌ Opción inválida. Inténtalo de nuevo." ;;
  esac
done

# Actualización recursiva global inicial para garantizar coherencia en archivos del tag elegido
echo -e "\n📦 Sincronizando la estructura del repositorio principal con la versión $TARGET_VERSION..."
sudo chown -R $USER:$USER ../Threat-Awareness/MISP_Server-docker/configs 2>/dev/null
git checkout "$TARGET_VERSION" -q

echo -e "🔄 Actualizando de forma recursiva todo el árbol de repositorios secundarios..."
git submodule update --init --recursive --force
echo -e "✅ Todos los componentes locales se encuentran ahora alineados con los commits de la versión $TARGET_VERSION.\n"

# Recolección de IPs de red
Cloud=$(cat /sys/class/dmi/id/sys_vendor)
SERVER_IP=$(hostname -I | awk '{print $1}')
if [[ "$Cloud" == "Amazon EC2" ]]; then
    SERVER_IP_PUBLIC=$(curl -s https://checkip.amazonaws.com)
    mispserver_url="https://${SERVER_IP_PUBLIC}:10443"
    UPDATE_SUMMARY+="Network: EC2 Instance detected. Public IP: $SERVER_IP_PUBLIC | Private IP: $SERVER_IP\n"
else
    mispserver_url="https://${SERVER_IP}:10443"
    UPDATE_SUMMARY+="Network: On-Premise instance detected. Private IP: $SERVER_IP\n"
fi


######################################################
#          EJECUCIÓN SECUENCIAL DE RELEASES          #
######################################################

case "$CURRENT_VERSION" in

    "v2.0.0")
        echo -e "\n🔄 [Fase 1] Aplicando cambios de la release: v2.0.0 -> v2.1.0"
        UPDATE_SUMMARY+="\n############### v2.1.0 ###############\n"

        VERSION_UPDATES=("Situation-Assessment_Network-Detection-Response" "Threat-Awareness_IoB")
        COMPONENTS_TO_UPDATE=()
        DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "
        for comp in "${VERSION_UPDATES[@]}"; do [[ "$DEPLOYMENT_LIST" == *" $comp "* ]] && COMPONENTS_TO_UPDATE+=("$comp"); done

        if [ ${#COMPONENTS_TO_UPDATE[@]} -gt 0 ]; then
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_IoB "* ]]; then
                read -p "Do you want to share IoBs with someone? (y/n): " answer_iob1
                if [[ "$answer_iob1" == "y" || "$answer_iob1" == "Y" ]]; then
                    read -p "Enter your peer's URL (<IP>:<PORT>): " peer_url
                    IOB_PEER_URL="http://${peer_url}"
                fi
                read -p "Do you want to receive the IoBs? (y/n): " answer_iob2
                [[ "$answer_iob2" == "y" || "$answer_iob2" == "Y" ]] && IOB_PEER_AUTH_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 40)

                cp "$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env.example" "$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"
                sed -i "s|PEER_URL=.*|PEER_URL=${IOB_PEER_URL:-}|g" "$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"
                sed -i "s|PEER_AUTH_TOKEN=.*|PEER_AUTH_TOKEN=${IOB_PEER_AUTH_TOKEN:-}|g" "$DOCKER_BASE_PATH/Threat-Awareness/IoB/.env"

                IOB_INTEGRATIONS="$DOCKER_BASE_PATH/Threat-Awareness/IoB/attack_flow_builder/src/components/Elements/IntegrationToolsDialog.vue"
                if [ -f "$IOB_INTEGRATIONS" ]; then
                    [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$IOB_INTEGRATIONS" || sed -i "s|localhost|${SERVER_IP}|g" "$IOB_INTEGRATIONS"
                fi
                IOB_APP_PATH="$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app"
                if [ ! -d "$IOB_APP_PATH/node_modules" ]; then NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$IOB_APP_PATH" install --legacy-peer-deps; fi
                NODE_OPTIONS="--openssl-legacy-provider" npm --prefix "$IOB_APP_PATH" run build
                UPDATE_SUMMARY+="- IoB (Threat Awareness): Módulo configurado y UI reconstruida.\n"
            fi

            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Network-Detection-Response "* ]]; then
                cp "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
                [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env" || sed -i "s|localhost|${SERVER_IP}|g" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
            fi

            SERVICES_TO_BUILD=()
            for component in "${COMPONENTS_TO_UPDATE[@]}"; do SERVICES_TO_BUILD+=(${SERVICES[$component]}); done
            docker compose -f "$COMPOSE_FILE" up -d --build "${SERVICES_TO_BUILD[@]}"
        fi

        CURRENT_VERSION="v2.1.0"
        if [ "$CURRENT_VERSION" == "$TARGET_VERSION" ]; then
            break 2>/dev/null || exit 0
        fi
        ;&

    "v2.1.0")
        echo -e "\n🔄 [Fase 2] Aplicando cambios de la release: v2.1.0 -> v2.2.0"
        UPDATE_SUMMARY+="\n############### v2.2.0 ###############\n"

        VERSION_UPDATES=("Situation-Assessment_Network-Detection-Response" "Situation-Assessment_Landing-Page" "Threat-Awareness_MISP-Server")
        COMPONENTS_TO_UPDATE=()
        DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "
        for comp in "${VERSION_UPDATES[@]}"; do [[ "$DEPLOYMENT_LIST" == *" $comp "* ]] && COMPONENTS_TO_UPDATE+=("$comp"); done

        if [ ${#COMPONENTS_TO_UPDATE[@]} -gt 0 ]; then
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_MISP-Server "* ]]; then
                sudo chown -R $USER:$USER "$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/configs" 2>/dev/null
                sudo chmod -R u+rw "$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/configs" 2>/dev/null
            fi

            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Network-Detection-Response "* ]]; then
                NDR_ENV="$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
                cp "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example" "$NDR_ENV"
                [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$NDR_ENV" || sed -i "s|localhost|${SERVER_IP}|g" "$NDR_ENV"

                while true; do
                    read -p "Do you have an OpenAI Key? [y/n]: " openai_key
                    if [[ "$openai_key" =~ ^[Yy]$ ]]; then
                        read -p "Enter your OpenAI Key: " openai_val
                        sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_val/" "$NDR_ENV"
                        break
                    elif [[ "$openai_key" =~ ^[Nn]$ ]]; then break; fi
                done

                while true; do
                    read -p "Do you have an Anthropic Key? [y/n]: " anthropic_key
                    if [[ "$anthropic_key" =~ ^[Yy]$ ]]; then
                        read -p "Enter your Anthropic Key: " anthropic_val
                        sed -i "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$anthropic_val/" "$NDR_ENV"
                        break
                    elif [[ "$anthropic_key" =~ ^[Nn]$ ]]; then break; fi
                done
            fi

            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Landing-Page "* ]]; then
                [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s/localhost/${SERVER_IP_PUBLIC}/g" "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json" || sed -i "s/localhost/${SERVER_IP}/g" "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json"
            fi

            SERVICES_TO_BUILD=()
            UPDATE_ONLY_SMTP=false
            for component in "${COMPONENTS_TO_UPDATE[@]}"; do
                [ "$component" == "Threat-Awareness_MISP-Server" ] && UPDATE_ONLY_SMTP=true || SERVICES_TO_BUILD+=(${SERVICES[$component]})
            done

            [ "$UPDATE_ONLY_SMTP" = true ] && sudo chown -R 33:33 "$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/configs" 2>/dev/null
            if [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
                docker compose -f "$COMPOSE_FILE" build --no-cache "${SERVICES_TO_BUILD[@]}"
                docker compose -f "$COMPOSE_FILE" up -d "${SERVICES_TO_BUILD[@]}"
            fi
            if [ "$UPDATE_ONLY_SMTP" = true ] && [ -n "${SERVICES[Threat-Awareness_MISP-Server]}" ]; then
                docker compose -f "$COMPOSE_FILE" build --no-cache resilmesh-tap-misp-mail
                docker compose -f "$COMPOSE_FILE" up -d --force-recreate resilmesh-tap-misp-mail
            fi
        fi

        if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_MISP-Server "* ]]; then
            docker compose -f "$COMPOSE_FILE" restart resilmesh-tap-misp-core resilmesh-tap-misp-db resilmesh-tap-misp-modules
            read -t 5
            docker compose -f "$COMPOSE_FILE" restart resilmesh-ap-misp-client
        fi

        CURRENT_VERSION="v2.2.0"
        if [ "$CURRENT_VERSION" == "$TARGET_VERSION" ]; then
            break 2>/dev/null || exit 0
        fi
        ;&

    "v2.2.0")
        echo -e "\n🔄 [Fase 3] Aplicando cambios de la release: v2.2.0 -> v2.3.0"
        UPDATE_SUMMARY+="\n############### v2.3.0 ###############\n"

        VERSION_UPDATES=("Threat-Awareness_PPCTI" "Situation-Assessment_CASM" "Situation-Assessment_ISIM" "Situation-Assessment_SACD" "Situation-Assessment_CSA" Security-Operations_Mitigation-Manager)
        COMPONENTS_TO_UPDATE=()
        DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "
        for comp in "${VERSION_UPDATES[@]}"; do [[ "$DEPLOYMENT_LIST" == *" $comp "* ]] && COMPONENTS_TO_UPDATE+=("$comp"); done

        if [ ${#COMPONENTS_TO_UPDATE[@]} -eq 0 ]; then
            echo -e "ℹ️ El entorno seleccionado ($DEPLOYMENT) no contiene módulos que requieran actualización en la v2.3.0."
            UPDATE_SUMMARY+="- Entorno $DEPLOYMENT: Ya se encuentra al día, no requiere reconstrucción de servicios en v2.3.0.\n"
        else
            ################ 🛠️ CONFIGURACIÓN PPCTI ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_PPCTI "* ]]; then
                echo -e "\n⚙️ Configurando variables de entorno para PPCTI..."
                PPCTI_DIR="$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI"

                if [ -f "$PPCTI_DIR/.env.example" ]; then
                    cp "$PPCTI_DIR/.env.example" "$PPCTI_DIR/.env"
                    [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$PPCTI_DIR/.env" || sed -i "s|localhost|${SERVER_IP}|g" "$PPCTI_DIR/.env"

                    MISP_KEY_DETECTED=$(grep "^ADMIN_KEY=" "$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/.env" | cut -d'=' -f2 | sed "s/['\"]//g" | tr -d '[:space:]')
                    if grep -q "MISP_API_KEY=" "$PPCTI_DIR/.env"; then
                        sed -i "s|^MISP_API_KEY=.*|MISP_API_KEY=$MISP_KEY_DETECTED|g" "$PPCTI_DIR/.env"
                    else
                        echo "MISP_API_KEY=$MISP_KEY_DETECTED" >> "$PPCTI_DIR/.env"
                    fi
                    export MISP_API_KEY="$MISP_KEY_DETECTED"
                    UPDATE_SUMMARY+="- PPCTI (Threat Awareness): .env generado e integrado con MISP.\n"
                fi
            fi
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

            ################ Configuración segura ISIM ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_ISIM "* ]]; then
                echo -e "\n🔐 Generando Certificados SSL y Archivos Nginx para ISIM...\n"
                mkdir -p "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/certs"
                mkdir -p "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/conf"

                openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                  -keyout "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/certs/isim.key" \
                  -out "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/certs/isim.crt" \
                  -subj "/CN=resilmesh-isim"

                cat << "EOF" > "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/conf/isim.conf"
server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/isim.crt;
    ssl_certificate_key /etc/nginx/certs/isim.key;

    location / {
        proxy_pass http://resilmesh-sap-isim-graphql:4001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
                UPDATE_SUMMARY+="- ISIM: Certificados SSL y proxy Nginx configurados.\n"
            fi

            ################ 📦 MANEJO DE CAMBIOS ESTRUCTURALES EN CASM ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_CASM "* ]]; then
                echo -e "\n🧹 Detectados cambios en la arquitectura de CASM (v2.3.0)..."
                OLD_CASM_SERVICES="resilmesh-sap-casm-postgres resilmesh-sap-casm-component-calculation-worker resilmesh-sap-casm-worker resilmesh-sap-casm-metasploitable3 resilmesh-sap-casm-component-scheduler-worker resilmesh-sap-casm-nmap-worker resilmesh-sap-casm-cve-connector-worker resilmesh-sap-casm-slp-enrichment-worker"

                echo -e "🛑 Deteniendo y removiendo contenedores obsoletos de CASM de forma selectiva..."
                docker compose -f "$COMPOSE_FILE" stop $OLD_CASM_SERVICES 2>/dev/null
                docker compose -f "$COMPOSE_FILE" rm -f $OLD_CASM_SERVICES 2>/dev/null
                
                SERVICES["Situation-Assessment_CASM"]="resilmesh-sap-casm-postgres resilmesh-sap-casm-component-calculation-worker resilmesh-sap-casm-worker resilmesh-sap-casm-metasploitable3 resilmesh-sap-casm-shared-worker resilmesh-sap-casm-cve-connector-worker resilmesh-sap-casm-slp-enrichment-worker"
                UPDATE_SUMMARY+="- CASM: Migración estructural completada (Contenedores obsoletos purgados).\n"
            fi

            ################ 📊 CONFIGURACIÓN COMPONENTE SACD ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_SACD "* ]]; then
                echo -e "\nLet's start with SACD component configuration..."

                SACD_ENV_PRODTS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.prod.ts"
                SACD_ENV_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.ts"
                SACD_EXTERNAL="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/external.ts"
                SACD_ENV_FILE_MISSION_EDITOR="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/pages/mission-editor-page/mission-editor.service.ts"

                if [ ! -f "$SACD_ENV_PRODTS_FILE" ]; then echo "❌ The file '$SACD_ENV_PRODTS_FILE' do not exist."; exit 1; fi
                if [ ! -f "$SACD_ENV_FILE" ]; then echo "❌ The file '$SACD_ENV_FILE' do not exist."; exit 1; fi
                if [ ! -f "$SACD_EXTERNAL" ]; then echo "❌ The file '$SACD_EXTERNAL' do not exist."; exit 1; fi
                if [ ! -f "$SACD_ENV_FILE_MISSION_EDITOR" ]; then echo "❌ The file '$SACD_ENV_FILE_MISSION_EDITOR' do not exist."; exit 1; fi

                if [[ "$Cloud" == "Amazon EC2" ]]; then
                    sed -i 's/localhost/'"$SERVER_IP_PUBLIC"'/g' "$SACD_ENV_PRODTS_FILE"
                    sed -i 's/localhost/'"$SERVER_IP_PUBLIC"'/g' "$SACD_ENV_FILE"
                    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$SACD_EXTERNAL"
                    sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$SACD_ENV_FILE_MISSION_EDITOR"
                else
                    sed -i 's/localhost/'"$SERVER_IP"'/g' "$SACD_ENV_PRODTS_FILE" 
                    sed -i 's/localhost/'"$SERVER_IP"'/g' "$SACD_ENV_FILE" 
                    sed -i "s|localhost|${SERVER_IP}|g" "$SACD_EXTERNAL" 
                    sed -i "s|localhost|${SERVER_IP}|g" "$SACD_ENV_FILE_MISSION_EDITOR"
                fi

                echo -e "\n✅ Server IP added for environment.ts and environment.prod.ts config files."
                UPDATE_SUMMARY+="- SACD: Archivos de entorno y Mission Editor actualizados con la IP del servidor.\n"
            fi

            # Construcción del listado de servicios final
            SERVICES_TO_BUILD=()
            for component in "${COMPONENTS_TO_UPDATE[@]}"; do SERVICES_TO_BUILD+=(${SERVICES[$component]}); done

            # Limpieza silenciosa preventiva de la caché de BuildKit antes de compilar
            echo -e "\n🧽 Solucionando preventivamente el problema de caché en Nginx..."
            docker builder prune -f > /dev/null 2>&1

            # Gestión de permisos para evitar fallos de compilación por Git
            ISIM_PLUGINS_PATH="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/plugins"
            if [ -d "$ISIM_PLUGINS_PATH" ]; then
                echo -e "🔐 Salvaguardando permisos de ISIM/plugins con privilegios elevados..."
                PREV_PERMS=$(stat -c "%a" "$ISIM_PLUGINS_PATH")
                sudo chmod -R 755 "$ISIM_PLUGINS_PATH"
            fi

            echo -e "\n🚀 Reconstruyendo y levantando componentes en Docker para v2.3.0...\n"
            docker compose -f "$COMPOSE_FILE" build --no-cache "${SERVICES_TO_BUILD[@]}"
            docker compose -f "$COMPOSE_FILE" up -d --remove-orphans "${SERVICES_TO_BUILD[@]}"
            UPDATE_SUMMARY+="- Componentes actualizados a v2.3.0: ${COMPONENTS_TO_UPDATE[*]}\n"

            # Restauración de permisos
            if [ -d "$ISIM_PLUGINS_PATH" ] && [ ! -z "$PREV_PERMS" ]; then
                echo -e "🔄 Restableciendo permisos de ISIM/plugins al estado previo ($PREV_PERMS)..."
                sudo chmod -R "$PREV_PERMS" "$ISIM_PLUGINS_PATH"
                echo -e "✅ Permisos restaurados con éxito."
            fi

            # ⚙️ ACTUALIZACIÓN DINÁMICA DEL ARCHIVO output_summary.txt EXISTENTE
            SUMMARY_FILE="./output_summary.txt"
            if [ -f "$SUMMARY_FILE" ]; then
                echo -e "\n📝 Actualizando endpoint de ISIM Graphql en output_summary.txt..."
                
                # Se determina la IP de destino según el entorno Cloud / On-Prem
                [[ "$Cloud" == "Amazon EC2" ]] && TARGET_IP="$SERVER_IP_PUBLIC" || TARGET_IP="$SERVER_IP"
                
                # Fila exacta alineada usando printf adaptada al nuevo proxy seguro Nginx en puerto 4443
                NEW_ROW=$(printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |" "Situation Assessment" "ISIM Graphql" "HTTPS" "$TARGET_IP" "4443" "https://$TARGET_IP:4443/graphql")
                
                # Usamos una asignación limpia con un archivo temporal para evitar que los caracteres '|' rompan sed
                awk -v new_line="$NEW_ROW" '/ISIM Graphql/ {print new_line; next} {print}' "$SUMMARY_FILE" > "$SUMMARY_FILE.tmp" && mv "$SUMMARY_FILE.tmp" "$SUMMARY_FILE"
                
                echo -e "✅ Archivo output_summary.txt modificado con éxito."
            fi
        fi

        CURRENT_VERSION="v2.3.0"
        echo -e "\n✅ ¡Actualización global a la versión $CURRENT_VERSION completada con éxito!\n"
        ;;
    *)
        echo -e "\nℹ️ Sin ruta de migración para la versión: $CURRENT_VERSION\n"
        ;;
esac

######################################################
#               IMPRESIÓN DEL REPORTE                #
######################################################
if [[ -n "$UPDATE_SUMMARY" ]]; then
    CURRENT_DATE=$(date "+%d/%m/%Y")
    {
        echo -e "\n================== RESUMEN FINAL DE LA OPERACIÓN ($CURRENT_DATE) =================="
        echo -e "Versión final alcanzada en el servidor: $CURRENT_VERSION"
        echo -e "\n$UPDATE_SUMMARY"
        echo -e "=================================================================================="
    } | tee -a output_summary.txt
fi