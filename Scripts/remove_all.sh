#!/bin/bash

DOCKER_BASE_PATH="../Docker"

# Parar y borrar todos los contenedores
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm -f

# Borrar todas las imágenes
docker images -q | xargs -r docker rmi -f

# Borrar redes específicas (ignora errores si no existen)
docker network ls --format '{{.Name}}' | grep -vE '^(bridge|host|none)$' | xargs -r docker network rm

# Borrar la carpeta $DOCKER_BASE_PATH del directorio actual (con sudo si hace falta)
rm $DOCKER_BASE_PATH/Aggregation/Enrichment/.env
rm $DOCKER_BASE_PATH/Aggregation/Vector/.env
rm $DOCKER_BASE_PATH/Aggregation/MISP_client/.env
rm $DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env
rm $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env
rm -rf $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/

# Mostrar el estado final de Docker
echo
echo "docker ps -a"
docker ps -a

echo
echo "docker images"
docker images

echo
echo "docker network ls"
docker network ls

