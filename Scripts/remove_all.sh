#!/bin/bash

DOCKER_BASE_PATH=".."

# Stop and delete all containers
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm -f

# Delete all images
docker images -q | xargs -r docker rmi -f

# Delete specific networks (ignore errors if they don't exist)
docker network ls --format '{{.Name}}' | grep -vE '^(bridge|host|none)$' | xargs -r docker network rm

# Delete the $DOCKER_BASE_PATH folder from the current directory (with sudo if necessary)
rm $DOCKER_BASE_PATH/Aggregation/Enrichment/.env
rm $DOCKER_BASE_PATH/Aggregation/Vector/.env
rm $DOCKER_BASE_PATH/Aggregation/MISP_client/.env
rm $DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env
rm $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env
rm -rf $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/

# Display final Docker status
echo
echo "docker ps -a"
docker ps -a

echo
echo "docker images"
docker images

echo
echo "docker network ls"
docker network ls

