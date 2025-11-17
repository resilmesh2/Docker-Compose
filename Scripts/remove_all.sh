#!/bin/bash
DOCKER_BASE_PATH="../Docker"

# Parar y borrar todos los contenedores
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm -f

# Borrar todas las imágenes
docker images -q | xargs -r docker rmi -f

# Borrar redes específicas (ignora errores si no existen)
docker network rm resilmesh_network resilmesh_network_misp 2>/dev/null

# Borrar la carpeta $DOCKER_BASE_PATH del directorio actual (con sudo si hace falta)
rm $DOCKER_BASE_PATH/Aggregation/Enrichment/.env
rm $DOCKER_BASE_PATH/Aggregation/Vector/.env
rm $DOCKER_BASE_PATH/Aggregation/MISP_client/.env
rm $DOCKER_BASE_PATH/Security-Operations/Mitigation-manager/.env
rm $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/.env
rm -rf $DOCKER_BASE_PATH/Security-Operations/Playbooks-tool/volumes/
