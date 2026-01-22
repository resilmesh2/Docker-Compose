#!/bin/bash

# NOTE: Run the script using sudo or with root permissions

exec > /dev/null 2>&1

DOCKER_BASE_PATH=".."

# Stop and delete all containers
docker ps -aq | xargs -r docker stop || true
docker ps -aq | xargs -r docker rm -f || true

# Delete all images
docker system prune -a --volumes -f || true

# Delete all volumes
docker volume ls -q | xargs -r docker volume rm || true

# Verification
docker images -q | xargs -r docker rmi -f || true
docker images -q | xargs -r docker rmi -f || true

# Delete specific networks (ignore errors if they don't exist)
docker network ls --format '{{.Name}}' | grep -vE '^(bridge|host|none)$' | xargs -r docker network rm || true

# Delete the .env files
rm -f $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/.env
rm -f $DOCKER_BASE_PATH/Threat-Awareness/MISP_Server-docker/.env
rm -f $DOCKER_BASE_PATH/Aggregation/MISP_client/.env
rm -f $DOCKER_BASE_PATH/Aggregation/Vector/.env
rm -f $DOCKER_BASE_PATH/Aggregation/Enrichment/.env
rm -f $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env
rm -f $DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env
rm -f $DOCKER_BASE_PATH/Situation-Assessment/ISIM/.env
rm -f $DOCKER_BASE_PATH/Situation-Assessment/Network-Detection-Response/.env
rm -f $DOCKER_BASE_PATH/Threat-Awareness/AI_Based_Detector/.env
rm -f $DOCKER_BASE_PATH/Threat-Awareness/IoB/.env
rm -f $DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/DFIR/.env
rm -f $DOCKER_BASE_PATH/Threat-Awareness/Threat-Hunting-And-Forensics/THF/.env

# Remove created directories
rm -rf $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/
rm -rf $DOCKER_BASE_PATH/Threat-Awareness/wazuh-docker/config
rm -rf $DOCKER_BASE_PATH/Situation-Assessment/ISIM/logs
rm -rf $DOCKER_BASE_PATH/Situation-Assessment/ISIM/plugins

# Remove npm configuration

rm -f "$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app/package-lock.json"
rm -rf "$DOCKER_BASE_PATH/Threat-Awareness/IoB/UI/app/node_modules"
npm cache clean --force

# Remove SLP API KEY
sed -i "s|x_api_key: \".*\"|x_api_key: \"\"|" "$DOCKER_BASE_PATH/Situation-Assessment/CASM/docker/config.yaml"