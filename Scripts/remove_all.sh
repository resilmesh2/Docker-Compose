#!/bin/bash

# Parar y borrar todos los contenedores
docker ps -aq | xargs -r docker stop
docker ps -aq | xargs -r docker rm -f

# Borrar todas las imágenes
docker images -q | xargs -r docker rmi -f

# Borrar redes específicas (ignora errores si no existen)
docker network rm resilmesh_network resilmesh_network_misp 2>/dev/null

# Borrar la carpeta Docker-Compose del directorio actual (con sudo si hace falta)
rm Docker-Compose/Aggregation/Enrichment/.env
rm Docker-Compose/Aggregation/Vector/.env
rm Docker-Compose/Aggregation/MISP_client/.env
rm Docker-Compose/Security-Operations/Mitigation-manager/.env
rm Docker-Compose/Security-Operations/Playbooks-tool/.env
rm -rf Docker-Compose/Security-Operations/Playbooks-tool/volumes/
