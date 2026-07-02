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
    ["Security-Operations_Mitigation-Manager"]="mitigation-manager"
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

# NOTE: Some Compose services have a fixed container_name that differs from
# the service name (e.g. "mitigation-manager" -> container "resilmesh-sop-mm").
# This table maps service name -> real container name so we can clean up
# name conflicts before recreating them.
declare -A CONTAINER_NAME_OVERRIDES=(
    ["mitigation-manager"]="resilmesh-sop-mm"
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

######################################################
#            DOCKER HELPER FUNCTIONS                 #
######################################################

cleanup_conflicting_containers() {
    local service_names=("$@")
    local real_name

    for svc in "${service_names[@]}"; do
        real_name="${CONTAINER_NAME_OVERRIDES[$svc]:-$svc}"

        existing_id=$(docker ps -aq -f "name=^/${real_name}$")
        if [ -n "$existing_id" ]; then
            echo -e "⚠️  Container '$real_name' (service '$svc') already exists (ID: $existing_id). Removing it to prevent conflicts..."
            docker rm -f "$existing_id" >/dev/null 2>&1
        fi
    done
}

compose_up_safe() {
    local compose_file="$1"
    shift
    local services_to_build=("$@")

    if [ ${#services_to_build[@]} -eq 0 ]; then
        return 0
    fi

    cleanup_conflicting_containers "${services_to_build[@]}"

    docker compose -f "$compose_file" build --no-cache "${services_to_build[@]}"
    local build_rc=$?

    docker compose -f "$compose_file" up -d --remove-orphans --force-recreate "${services_to_build[@]}"
    local up_rc=$?

    if [ $build_rc -ne 0 ] || [ $up_rc -ne 0 ]; then
        echo -e "\n❌ Error: One or more services failed to build/start correctly (build_rc=$build_rc, up_rc=$up_rc). Please check logs above."
        return 1
    fi

    return 0
}

######################################################
#       CASM TEMPORAL SCHEDULE MIGRATION (v2.3.0)    #
######################################################
# Root cause (confirmed via CASM's workflow.py,
# initialize_core_component_schedules): on startup CASM only calls
# client.create_schedule(schedule_id, schedule). If the Schedule ID
# already exists, it catches ScheduleAlreadyRunningError, logs
# "component_schedule_already_exists" and does nothing else — it never
# updates the existing Schedule's action (Workflow Type / Task Queue).
# So a Schedule created in v2.2.0 (e.g. Workflow Type
# "ComponentCalculationWorkflow" / Task Queue "component-calculation",
# or Task Queue "component-calculations" for the risk formula schedule)
# is left untouched forever after upgrading to v2.3.0.
#
# Fix: delete each known-affected Schedule ID BEFORE the new v2.3.0 CASM
# containers start. On their next startup, create_schedule() will
# succeed (no ID collision) and recreate them with the correct v2.3.0
# Workflow Type / Task Queue. This is safe and idempotent: if a Schedule
# doesn't exist, the delete attempt is simply skipped.
migrate_casm_schedules() {
    local temporal_admin_container="${TEMPORAL_ADMIN_CONTAINER:-resilmesh-sop-wo-temporal-admin-tools}"
    local temporal_address="${TEMPORAL_ADDRESS:-resilmesh-sop-wo-temporal:7233}"
    local temporal_namespace="${TEMPORAL_NAMESPACE:-default}"

    # Confirmed from workflow.py (initialize_core_component_schedules):
    #   component-schedule-criticality / threatScore / cvss_score
    # Confirmed from the Temporal Web UI "Edit Schedule" view (stale Task
    # Queue "component-calculations" instead of "shared"):
    #   automation-schedule-base-risk
    local casm_schedule_ids=(
        "component-schedule-criticality"
        "component-schedule-threatScore"
        "component-schedule-cvss_score"
        "automation-schedule-base-risk"
    )

    echo -e "\n🔎 Migrating CASM Temporal schedules to v2.3.0 configuration..."

    for schedule_id in "${casm_schedule_ids[@]}"; do
        if docker exec "$temporal_admin_container" \
            temporal schedule describe \
            --address "$temporal_address" \
            --namespace "$temporal_namespace" \
            --schedule-id "$schedule_id" >/dev/null 2>&1; then

            echo "⚠️  Schedule '$schedule_id' exists with potentially stale v2.2.0 config. Deleting so v2.3.0 CASM can recreate it correctly..."
            docker exec "$temporal_admin_container" \
                temporal schedule delete \
                --address "$temporal_address" \
                --namespace "$temporal_namespace" \
                --schedule-id "$schedule_id"
            echo "✅ Deleted '$schedule_id'."
        else
            echo "ℹ️  Schedule '$schedule_id' not found — nothing to migrate (already clean or not yet created)."
        fi
    done

    echo -e "🔄 Done. CASM v2.3.0 containers should recreate any deleted schedules on next startup with the correct Workflow Type / Task Queue.\n"
}

# 1. Get Git tags to determine the current state
git fetch --tags -q
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null)
LATEST_VERSION=$(git tag -l "v[0-9]*.[0-9]*.0" --sort=-v:refname | head -n 1)

echo -e "\n=============================================="
echo -e "  Detected version:     \033[1;32m$CURRENT_VERSION\033[0m"
echo -e "  Latest available tag: \033[1;36m$LATEST_VERSION\033[0m"
echo -e "==============================================\n"

if [ "$CURRENT_VERSION" == "$LATEST_VERSION" ]; then
    echo -e "✅ The system is already up to date with the latest version ($LATEST_VERSION).\n"
    exit 0
fi

# 2. Interactive menu to select the target version
echo "Select the version you want to upgrade the system to:"
echo "1) v2.1.0"
echo "2) v2.2.0"
echo "3) v2.3.0 (Latest version)"
echo "4) Exit"
echo
read -p "Enter an option (1-4): " target_option

case $target_option in
    1) TARGET_VERSION="v2.1.0" ;;
    2) TARGET_VERSION="v2.2.0" ;;
    3) TARGET_VERSION="v2.3.0" ;;
    *) echo -e "\nUpgrade cancelled by user or invalid selection.\n"; exit 0 ;;
esac

VERSION_CUR_NUM="${CURRENT_VERSION#v}"
VERSION_TAR_NUM="${TARGET_VERSION#v}"

if [[ "$VERSION_CUR_NUM" == "$VERSION_TAR_NUM" ]]; then
    echo -e "\n❌ Error: You are already on version $TARGET_VERSION.\n"
    exit 1
elif [ "$(printf '%s\n' "$VERSION_TAR_NUM" "$VERSION_CUR_NUM" | sort -V | head -n1)" == "$VERSION_TAR_NUM" ]; then
    echo -e "\n❌ Error: Cannot downgrade to version $TARGET_VERSION because your current version is higher ($CURRENT_VERSION).\n"
    exit 1
fi

# 3. Target deployment environment selection
while true; do
  echo -e "\nSelect your target deployment environment:"
  echo "1) IT Domain (ICERT)"
  echo "2) IoT Domain (ALIAS)"
  echo "3) Domain (CARM)"
  echo "4) Full Platform"
  read -p "Option (1-4): " option

  case $option in
    1) DEPLOYMENT="IT_Domain"; COMPOSE_FILE="../docker-compose-IT_Domain.yml"; break ;;
    2) DEPLOYMENT="IoT_Domain"; COMPOSE_FILE="../docker-compose-IoT_Domain.yml"; break ;;
    3) DEPLOYMENT="Domain"; COMPOSE_FILE="../docker-compose-Domain.yml"; break ;;
    4) DEPLOYMENT="Full_Platform"; COMPOSE_FILE="../docker-compose-Full_Platform.yml"; break ;;
    *) echo -e "\n❌ Invalid option. Please try again." ;;
  esac
done

echo -e "\n📦 Syncing the main repository structure with version $TARGET_VERSION..."
sudo chown -R $USER:$USER ../Threat-Awareness/MISP_Server-docker/configs 2>/dev/null
git checkout "$TARGET_VERSION" -q

echo -e "🔄 Recursively updating the entire submodule tree..."
git submodule update --init --recursive --force
echo -e "✅ All local components are now aligned with commits for version $TARGET_VERSION.\n"

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
#         SEQUENTIAL EXECUTION OF RELEASES           #
######################################################

case "$CURRENT_VERSION" in

    "v2.0.0")
        echo -e "\n🔄 [Phase 1] Applying changes for release: v2.0.0 -> v2.1.0"
        UPDATE_SUMMARY+="\n############### v2.1.0 ###############\n"

        VERSION_UPDATES=("Situation-Assessment_Network-Detection-Response" "Threat-Awareness_IoB")
        COMPONENTS_TO_UPDATE=()
        DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "
        for comp in "${VERSION_UPDATES[@]}"; do [[ "$DEPLOYMENT_LIST" == *" $comp "* ]] && COMPONENTS_TO_UPDATE+=("$comp"); done

        if [ ${#COMPONENTS_TO_UPDATE[@]} -gt 0 ]; then
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_IoB "* ]]; then
                read -p "Do you want to share IoBs with a peer? (y/n): " answer_iob1
                if [[ "$answer_iob1" == "y" || "$answer_iob1" == "Y" ]]; then
                    read -p "Enter your peer's URL (<IP>:<PORT>): " peer_url
                    IOB_PEER_URL="http://${peer_url}"
                fi
                read -p "Do you want to authorize receiving IoBs from them? (y/n): " answer_iob2
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
                UPDATE_SUMMARY+="- IoB (Threat Awareness): Module configured and UI rebuilt.\n"
            fi

            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Network-Detection-Response "* ]]; then
                cp "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/env.example" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
                [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env" || sed -i "s|localhost|${SERVER_IP}|g" "$DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env"
            fi

            SERVICES_TO_BUILD=()
            for component in "${COMPONENTS_TO_UPDATE[@]}"; do SERVICES_TO_BUILD+=(${SERVICES[$component]}); done

            compose_up_safe "$COMPOSE_FILE" "${SERVICES_TO_BUILD[@]}" \
                || UPDATE_SUMMARY+="- ⚠️ WARNING: Failures detected while starting v2.1.0 services (check Docker logs).\n"
        fi

        CURRENT_VERSION="v2.1.0"
        if [ "$CURRENT_VERSION" == "$TARGET_VERSION" ]; then
            break 2>/dev/null || exit 0
        fi
        ;&

    "v2.1.0")
        echo -e "\n🔄 [Phase 2] Applying changes for release: v2.1.0 -> v2.2.0"
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

            compose_up_safe "$COMPOSE_FILE" "${SERVICES_TO_BUILD[@]}" \
                || UPDATE_SUMMARY+="- ⚠️ WARNING: Failures detected while starting v2.2.0 services (check Docker logs).\n"

            if [ "$UPDATE_ONLY_SMTP" = true ] && [ -n "${SERVICES[Threat-Awareness_MISP-Server]}" ]; then
                compose_up_safe "$COMPOSE_FILE" "resilmesh-tap-misp-mail" \
                    || UPDATE_SUMMARY+="- ⚠️ WARNING: Failed to recreate resilmesh-tap-misp-mail.\n"
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
        echo -e "\n🔄 [Phase 3] Applying changes for release: v2.2.0 -> v2.3.0"
        UPDATE_SUMMARY+="\n############### v2.3.0 ###############\n"

        # ── IoT_Domain exclusion ─────────────────────────────────────────────
        # v2.3.0 introduces: PPCTI, CASM structural changes, ISIM HTTPS proxy,
        # SACD updates, CSA and Mitigation Manager. None of these components
        # belong to the IoT_Domain deployment profile, so this entire phase
        # is a no-op for that environment. This explicit guard makes the
        # exclusion clear rather than relying on COMPONENTS_TO_UPDATE being
        # implicitly empty.
        if [[ "$DEPLOYMENT" == "IoT_Domain" ]]; then
            echo -e "ℹ️  IoT Domain environment: no v2.3.0 components apply to this profile."
            echo -e "    Components updated in this release (PPCTI, CASM, ISIM, SACD, CSA,"
            echo -e "    Mitigation Manager, Landing page) are not part of the IoT_Domain deployment.\n"
            UPDATE_SUMMARY+="- IoT Domain: excluded from v2.3.0 changes (none of the updated components belong to this profile).\n"
            CURRENT_VERSION="v2.3.0"
            echo -e "\n✅ IoT Domain is already aligned with v2.3.0 — no changes needed.\n"
        else

        VERSION_UPDATES=("Situation-Assessment_Landing-Page" "Threat-Awareness_PPCTI" "Situation-Assessment_CASM" "Situation-Assessment_ISIM" "Situation-Assessment_SACD" "Situation-Assessment_CSA" "Security-Operations_Mitigation-Manager")
        COMPONENTS_TO_UPDATE=()
        DEPLOYMENT_LIST=" ${DEPLOYMENTS[$DEPLOYMENT]} "
        for comp in "${VERSION_UPDATES[@]}"; do [[ "$DEPLOYMENT_LIST" == *" $comp "* ]] && COMPONENTS_TO_UPDATE+=("$comp"); done

        if [ ${#COMPONENTS_TO_UPDATE[@]} -eq 0 ]; then
            echo -e "ℹ️ The selected environment ($DEPLOYMENT) does not contain modules requiring a v2.3.0 update."
            UPDATE_SUMMARY+="- Environment $DEPLOYMENT: Already up to date, no service rebuild required for v2.3.0.\n"
        else
            ################ 🛠️ PPCTI CONFIGURATION ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Threat-Awareness_PPCTI "* ]]; then
                echo -e "\n⚙️ Configuring environment variables for PPCTI..."
                PPCTI_DIR="$DOCKER_BASE_PATH/Threat-Awareness/PP-CTI"

                if [ -f "$PPCTI_DIR/.env.example" ]; then
                    cp "$PPCTI_DIR/.env.example" "$PPCTI_DIR/.env"
                    [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s|localhost|${SERVER_IP_PUBLIC}|g" "$PPCTI_DIR/.env" || sed -i "s|localhost|${SERVER_IP}|g" "$PPCTI_DIR/.env"

                    MISP_ENV_FILE="$DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/.env"
                    if [ -f "$MISP_ENV_FILE" ]; then
                        MISP_KEY_DETECTED=$(grep "^ADMIN_KEY=" "$MISP_ENV_FILE" | cut -d'=' -f2 | sed "s/['\"]//g" | tr -d '[:space:]')
                    else
                        echo -e "\n⚠️ MISP Server .env file not found — MISP_API_KEY cannot be injected into PPCTI."
                    fi

                    if [[ -z "$MISP_KEY_DETECTED" ]]; then
                        echo -e "\n❌ MISP_API_KEY is empty. Cannot proceed without this key.\n"
                        exit 1
                    fi
                    if grep -q "MISP_API_KEY=" "$PPCTI_DIR/.env"; then
                        sed -i "s|^MISP_API_KEY=.*|MISP_API_KEY=$MISP_KEY_DETECTED|g" "$PPCTI_DIR/.env"
                    else
                        echo "MISP_API_KEY=$MISP_KEY_DETECTED" >> "$PPCTI_DIR/.env"
                    fi
                    export MISP_API_KEY="$MISP_KEY_DETECTED"
                    UPDATE_SUMMARY+="- PPCTI (Threat Awareness): .env generated and integrated with MISP.\n"
                fi
            fi

            ####### MITIGATION MANAGER CONFIGURATION ############
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Security-Operations_Mitigation-Manager "* ]]; then
                echo -e "\nConfiguring Mitigation Manager component variables..."
                echo -e "\nCreating Mitigation Manager .env file..."

                MM_ORIGINAL_FILE="$DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env.example"
                MM_COPY_FILE="$DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env"

                if [ ! -f "$MM_ORIGINAL_FILE" ]; then
                    echo "❌ The file '$MM_ORIGINAL_FILE' does not exist."
                    exit 1
                fi

                cp "$MM_ORIGINAL_FILE" "$MM_COPY_FILE"
                echo -e "\n✅ File .env created."
                UPDATE_SUMMARY+="- Mitigation Manager: .env generated.\n"
            fi

            ################ Secure ISIM configuration ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_ISIM "* ]]; then
                echo -e "\n🔐 Generating SSL CA chain and Nginx configuration for ISIM...\n"
                mkdir -p "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/certs"
                mkdir -p "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/conf"

                [[ "$Cloud" == "Amazon EC2" ]] && ISIM_CERT_IP="$SERVER_IP_PUBLIC" || ISIM_CERT_IP="$SERVER_IP"
                ISIM_CERT_PATH="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/certs"

                # ── Why a CA chain instead of a plain self-signed cert? ──────────
                # Browsers block iframe/XHR requests to endpoints with untrusted
                # certs (NET::ERR_CERT_AUTHORITY_INVALID) even when the user has
                # previously accepted the warning for direct navigation — the
                # "proceed anyway" exception does not carry over to embedded
                # content loaded by SACD. A self-signed cert (even with a correct
                # IP SAN) is always untrusted until imported as a root authority.
                #
                # By generating a local Root CA and signing ISIM's cert with it,
                # operators need to import only the CA cert ONCE into their browser
                # or OS trust store. After that:
                #   • No more security warnings in SACD.
                #   • No manual "proceed anyway" clicks.
                #   • When the server cert expires and is regenerated, operators
                #     do NOT need to re-import anything — the CA stays the same.
                # ─────────────────────────────────────────────────────────────────

                echo -e "🔑 Step 1/3 — Generating Resilmesh Internal Root CA..."
                openssl genrsa -out "$ISIM_CERT_PATH/resilmesh_ca.key" 4096 2>/dev/null
                openssl req -x509 -new -nodes \
                  -key  "$ISIM_CERT_PATH/resilmesh_ca.key" \
                  -sha256 -days 1825 \
                  -out  "$ISIM_CERT_PATH/resilmesh_ca.crt" \
                  -subj "/O=Resilmesh/CN=Resilmesh Internal CA"

                echo -e "🔑 Step 2/3 — Generating ISIM server key and CSR..."
                openssl genrsa -out "$ISIM_CERT_PATH/isim.key" 2048 2>/dev/null
                openssl req -new \
                  -key  "$ISIM_CERT_PATH/isim.key" \
                  -out  "$ISIM_CERT_PATH/isim.csr" \
                  -subj "/O=Resilmesh/CN=${ISIM_CERT_IP}"

                # SAN extension — required by modern browsers for IP-based endpoints
                printf "subjectAltName=IP:%s\n" "$ISIM_CERT_IP" > "$ISIM_CERT_PATH/isim_san.cnf"

                echo -e "🔑 Step 3/3 — Signing ISIM cert with Resilmesh CA..."
                openssl x509 -req \
                  -in      "$ISIM_CERT_PATH/isim.csr" \
                  -CA      "$ISIM_CERT_PATH/resilmesh_ca.crt" \
                  -CAkey   "$ISIM_CERT_PATH/resilmesh_ca.key" \
                  -CAcreateserial \
                  -out     "$ISIM_CERT_PATH/isim.crt" \
                  -days    365 \
                  -sha256 \
                  -extfile "$ISIM_CERT_PATH/isim_san.cnf" 2>/dev/null

                # Clean up CSR and SAN temp file (keep CA key for future renewals)
                rm -f "$ISIM_CERT_PATH/isim.csr" "$ISIM_CERT_PATH/isim_san.cnf"

                # ── Export the CA cert for operator import ────────────────────────
                # Operators import THIS file (not the server cert) into their
                # browser / OS trust store — just once, permanently.
                cp "$ISIM_CERT_PATH/resilmesh_ca.crt" "./resilmesh_isim_ca.crt"
                echo -e "\n✅ Certificates generated successfully."
                echo -e "\n📋 ══════════════════════════════════════════════════════════════"
                echo -e "   CA CERTIFICATE FOR BROWSER IMPORT: $(pwd)/resilmesh_isim_ca.crt"
                echo -e "   Import this file ONCE — no need to re-import on cert renewal."
                echo -e "   ══════════════════════════════════════════════════════════════"
                echo -e "\n   ── Chrome / Edge (Windows / Linux / Mac):"
                echo -e "        Settings → Privacy → Manage certificates → Authorities → Import"
                echo -e "        Select: resilmesh_isim_ca.crt  ✓ Trust for websites"
                echo -e "\n   ── Firefox:"
                echo -e "        Settings → Privacy → View Certificates → Authorities → Import"
                echo -e "        Select: resilmesh_isim_ca.crt  ✓ Trust this CA to identify websites"
                echo -e "\n   ── Ubuntu / Debian (system-wide, picked up by Chrome/Edge):"
                echo -e "        sudo cp resilmesh_isim_ca.crt /usr/local/share/ca-certificates/resilmesh-isim.crt"
                echo -e "        sudo update-ca-certificates"
                echo -e "\n   ── After import: no more security warnings in SACD. No 'proceed anyway' needed."
                echo -e "   ══════════════════════════════════════════════════════════════\n"

                cat << 'NGINXEOF' > "$DOCKER_BASE_PATH/Situation-Assessment/ISIM/nginx/conf/isim.conf"
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
NGINXEOF

                if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_Landing-Page "* ]]; then
                    [[ "$Cloud" == "Amazon EC2" ]] && sed -i "s/localhost/${SERVER_IP_PUBLIC}/g" "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json" || sed -i "s/localhost/${SERVER_IP}/g" "$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json"
                fi
                # Update Landing Page entries.json: replace the ISIM GraphQL
                # entry with the new HTTPS proxy URL (port 4443).
                # Handles both cases:
                #   a) localhost not yet replaced → http://localhost:4001/graphql
                #   b) Already replaced in v2.2.0  → http://IP:4001/graphql
                #LANDING_ENTRIES="$DOCKER_BASE_PATH/Situation-Assessment/Landing-Page/src/data/entries.json"
                #if [ -f "$LANDING_ENTRIES" ]; then
                 #  echo -e "\n📝 Updating ISIM GraphQL entry in Landing Page entries.json..."
                    # Step 1: replace localhost with IP in case it hasn't been done yet
                    # sed -i "s|http://localhost:4001/graphql|https://${ISIM_CERT_IP}:4443/graphql|g" "$LANDING_ENTRIES"
                    # Step 2: replace already-substituted IP:4001 with IP:4443 + HTTPS
                    #sed -i "s|http://${ISIM_CERT_IP}:4001/graphql|https://${ISIM_CERT_IP}:4443/graphql|g" "$LANDING_ENTRIES"
                  # echo -e "✅ entries.json updated: ISIM GraphQL → https://${ISIM_CERT_IP}:4443/graphql"
                   # UPDATE_SUMMARY+="- Landing Page entries.json: ISIM GraphQL link updated to https://${ISIM_CERT_IP}:4443/graphql.\n"
                #else
                 #   echo -e "⚠️  entries.json not found at $LANDING_ENTRIES — skipping Landing Page update."
                #fi

                ISIM_CERT_EXPIRY=$(date -d "+365 days" "+%d/%m/%Y")
                UPDATE_SUMMARY+="- ISIM: CA chain generated (Resilmesh Internal CA → isim.crt with IP SAN ${ISIM_CERT_IP}).\n"
                UPDATE_SUMMARY+="- ISIM: ⚠️  Certificate expires on ${ISIM_CERT_EXPIRY} — regenerate before that date to avoid SACD GraphQL disruption.\n"
                UPDATE_SUMMARY+="- ISIM: CA cert exported to ./resilmesh_isim_ca.crt — import into browser/OS once to permanently trust ISIM HTTPS.\n"
                UPDATE_SUMMARY+="- ISIM: Nginx HTTPS proxy configured on port 4443.\n"
            fi

            ################ 📦 HANDLING CASM STRUCTURAL CHANGES ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_CASM "* ]]; then
                echo -e "\n🧹 Architectural updates detected in CASM (v2.3.0)..."
                OLD_CASM_SERVICES=(resilmesh-sap-casm-component-scheduler-worker resilmesh-sap-casm-nmap-worker)

                echo -e "🛑 Safely removing obsolete CASM containers..."
                docker compose -f "$COMPOSE_FILE" stop "${OLD_CASM_SERVICES[@]}" 2>/dev/null
                docker compose -f "$COMPOSE_FILE" rm -f "${OLD_CASM_SERVICES[@]}" 2>/dev/null

                SERVICES["Situation-Assessment_CASM"]="resilmesh-sap-casm-postgres resilmesh-sap-casm-component-calculation-worker resilmesh-sap-casm-worker resilmesh-sap-casm-metasploitable3 resilmesh-sap-casm-shared-worker resilmesh-sap-casm-cve-connector-worker resilmesh-sap-casm-slp-enrichment-worker"
                UPDATE_SUMMARY+="- CASM: Structural migration completed (obsolete containers purged).\n"

                # NEW: migrate stale Temporal schedules BEFORE the new CASM
                # containers are built/started below, so create_schedule()
                # finds a clean slate and recreates them with the correct
                # v2.3.0 Workflow Type / Task Queue.
                migrate_casm_schedules
                UPDATE_SUMMARY+="- CASM: Stale v2.2.0 Temporal schedules removed for clean recreation in v2.3.0.\n"
            fi

            ################ 📊 SACD COMPONENT CONFIGURATION ################
            if [[ " ${COMPONENTS_TO_UPDATE[*]} " == *" Situation-Assessment_SACD "* ]]; then
                echo -e "\nInjecting host configurations into SACD..."

                SACD_ENV_PRODTS_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.prod.ts"
                SACD_ENV_FILE="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/environments/environment.ts"
                SACD_EXTERNAL="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/external.ts"
                SACD_ENV_FILE_MISSION_EDITOR="$DOCKER_BASE_PATH/Situation-Assessment/SACD/src/app/pages/mission-editor-page/mission-editor.service.ts"

                if [ ! -f "$SACD_ENV_PRODTS_FILE" ]; then echo "❌ The file '$SACD_ENV_PRODTS_FILE' does not exist."; exit 1; fi
                if [ ! -f "$SACD_ENV_FILE" ]; then echo "❌ The file '$SACD_ENV_FILE' does not exist."; exit 1; fi
                if [ ! -f "$SACD_EXTERNAL" ]; then echo "❌ The file '$SACD_EXTERNAL' does not exist."; exit 1; fi
                if [ ! -f "$SACD_ENV_FILE_MISSION_EDITOR" ]; then echo "❌ The file '$SACD_ENV_FILE_MISSION_EDITOR' does not exist."; exit 1; fi

                [[ "$Cloud" == "Amazon EC2" ]] && SACD_TARGET_IP="$SERVER_IP_PUBLIC" || SACD_TARGET_IP="$SERVER_IP"

                # Step 1: replace localhost -> IP in all four files.
                # Covers fresh deployments and upgrades where localhost was
                # never replaced (e.g. SACD first deployed in v2.3.0).
                sed -i "s|localhost|${SACD_TARGET_IP}|g" "$SACD_ENV_PRODTS_FILE"
                sed -i "s|localhost|${SACD_TARGET_IP}|g" "$SACD_ENV_FILE"
                sed -i "s|localhost|${SACD_TARGET_IP}|g" "$SACD_EXTERNAL"
                sed -i "s|localhost|${SACD_TARGET_IP}|g" "$SACD_ENV_FILE_MISSION_EDITOR"

                # Step 2: in external.ts only, replace the direct GraphQL
                # endpoint (http://IP:4001/graphql) with the Nginx HTTPS
                # reverse proxy (https://IP:4443/graphql). Covers both:
                #   a) Fresh v2.3.0: after step 1 the URL reads
                #      http://IP:4001/graphql -> https://IP:4443/graphql
                #   b) Upgrade from v2.2.0 where SACD was already deployed
                #      with http://IP:4001/graphql (localhost already replaced)
                #      -> same substitution fixes the port and scheme.
                sed -i "s|http://${SACD_TARGET_IP}:4001/graphql|https://${SACD_TARGET_IP}:4443/graphql|g" "$SACD_EXTERNAL"

                echo -e "\n✅ Server IP injected and ISIM GraphQL endpoint in external.ts updated to HTTPS proxy (port 4443)."
                UPDATE_SUMMARY+="- SACD: external.ts updated — ISIM GraphQL endpoint migrated to https://IP:4443/graphql (Nginx HTTPS proxy).\n"
                UPDATE_SUMMARY+="- SACD: environment.ts, environment.prod.ts and Mission Editor updated with host IP.\n"
            fi

            SERVICES_TO_BUILD=()
            for component in "${COMPONENTS_TO_UPDATE[@]}"; do SERVICES_TO_BUILD+=(${SERVICES[$component]}); done

            echo -e "\n🧽 Proactively clearing BuildKit/Nginx cache tags..."
            docker builder prune -f > /dev/null 2>&1

            PREV_PERMS=""
            ISIM_PLUGINS_PATH="$DOCKER_BASE_PATH/Situation-Assessment/ISIM/plugins"
            if [ -d "$ISIM_PLUGINS_PATH" ]; then
                echo -e "🔐 Preserving ISIM directory permissions with elevated context..."
                PREV_PERMS=$(stat -c "%a" "$ISIM_PLUGINS_PATH")
                sudo chmod -R 755 "$ISIM_PLUGINS_PATH"
            fi

            echo -e "\n🚀 Rebuilding and launching Docker components for v2.3.0...\n"
            compose_up_safe "$COMPOSE_FILE" "${SERVICES_TO_BUILD[@]}"
            COMPOSE_RC=$?
            if [ $COMPOSE_RC -ne 0 ]; then
                UPDATE_SUMMARY+="- ⚠️ WARNING: Failures encountered while launching v2.3.0 instances. Check name overrides or logs.\n"
            fi
            UPDATE_SUMMARY+="- Components updated to v2.3.0: ${COMPONENTS_TO_UPDATE[*]}\n"

            if [ -d "$ISIM_PLUGINS_PATH" ] && [ -n "$PREV_PERMS" ]; then
                echo -e "🔄 Restoring original ISIM folder permissions back to ($PREV_PERMS)..."
                sudo chmod -R "$PREV_PERMS" "$ISIM_PLUGINS_PATH"
                echo -e "✅ Permissions successfully restored."
            fi

            # ⚙️ PREVENTIVE MISP CORE & CLIENT ACCESSIBILITY FIX AT END OF V2.3.0
            if [[ " ${DEPLOYMENTS[$DEPLOYMENT]} " == *" Threat-Awareness_MISP-Server "* ]]; then
                echo -e "\n🔄 Applying routing accessibility patch for MISP Server stacks..."
                echo -e "🛑 Triggering restart of 'resilmesh-tap-misp-core'..."
                docker compose -f "$COMPOSE_FILE" restart resilmesh-tap-misp-core

                echo -e "⏳ Polling for 10 seconds to allow network sockets inside the core core to bind..."
                sleep 10

                echo -e "🔄 Refreshing network bridge on 'resilmesh-ap-misp-client'..."
                docker compose -f "$COMPOSE_FILE" restart resilmesh-ap-misp-client
                echo -e "✅ MISP accessibility patches applied successfully."
                UPDATE_SUMMARY+="- MISP Core Accessibility Patch: Sequential container refresh successfully executed.\n"
            fi

            SUMMARY_FILE="./output_summary.txt"
            if [ -f "$SUMMARY_FILE" ]; then
                echo -e "\n📝 Updating ISIM Graphql endpoint in output_summary.txt..."

                [[ "$Cloud" == "Amazon EC2" ]] && TARGET_IP="$SERVER_IP_PUBLIC" || TARGET_IP="$SERVER_IP"

                NEW_ROW=$(printf "| %-20s | %-26s | %-8s | %-15s | %-5s | %-62s |" "Situation Assessment" "ISIM Graphql" "HTTPS" "$TARGET_IP" "4443" "https://$TARGET_IP:4443/graphql")

                if grep -q "ISIM Graphql" "$SUMMARY_FILE"; then
                    awk -v new_line="$NEW_ROW" '/ISIM Graphql/ {print new_line; next} {print}' "$SUMMARY_FILE" > "$SUMMARY_FILE.tmp" && mv "$SUMMARY_FILE.tmp" "$SUMMARY_FILE"
                    echo -e "✅ output_summary.txt updated successfully."
                else
                    echo "$NEW_ROW" >> "$SUMMARY_FILE"
                    echo -e "⚠️ No 'ISIM Graphql' token found — appending entry to the end of the summary file."
                fi
            fi
        fi

        CURRENT_VERSION="v2.3.0"
        if [ "${COMPOSE_RC:-0}" -eq 0 ]; then
            echo -e "\n✅ Global upgrade to version $CURRENT_VERSION completed successfully!\n"
        else
            echo -e "\n⚠️ Upgrade to version $CURRENT_VERSION finished WITH ERRORS. Check details above and Docker runtime logs.\n"
        fi

        fi  # end IoT_Domain else
        ;;
    *)
        echo -e "\nℹ️ No valid migration manifest found for engine state: $CURRENT_VERSION\n"
        ;;
esac

######################################################
#                REPORT PRINTING                     #
######################################################
if [[ -n "$UPDATE_SUMMARY" ]]; then
    CURRENT_DATE=$(date "+%m/%d/%Y")
    {
        echo -e "\n================== FINAL OPERATION SUMMARY ($CURRENT_DATE) =================="
        echo -e "Final version reached on the server: $CURRENT_VERSION"
        echo -e "Details:"
        echo -e "$UPDATE_SUMMARY"
        echo -e "=========================================================================\n"
    }
fi