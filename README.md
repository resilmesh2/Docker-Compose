# Resilmesh Framework
ResilMesh is an Innovation Action project funded by the European Union, dedicated to revolutionizing cybersecurity practices.

At its core, ResilMesh endeavors to develop a cutting-edge security orchestration and analytics toolset grounded in cyber situational awareness (CSA). This initiative aims to equip organizations with the capabilities needed for real-time defense of essential business functions in an era marked by dispersed, heterogeneous cyber systems.

_see: https://resilmesh.eu/_

## Architecture
Here's a UML to help you understand the architecture:
```mermaid
---
title: Resilmesh Architecture
config:
   theme: dark
   noteAlign: left
---
sequenceDiagram

   participant Vector
   participant NATS
   participant SLP-Enrichment
   note over SLP-Enrichment: Micro service enriches events
   participant Wazuh
   participant MISP-Client
   note over MISP-Client: Micro service leverages MISP API
   participant MISP
   
   Vector->>+Vector: watch datasets files
   Vector->>+Vector: dedupe events
   Vector->>+Vector: normalize (ECS) events
   Vector->>NATS: publish to<br/>'ecs_events' queue
   NATS->>SLP-Enrichment: subscribe to 'ecs_events'<br/>and enrich events
   SLP-Enrichment-->>NATS: publish to<br/>'enriched_events' queue
   NATS-->>Vector: source from 'enriched_events' queue
   Vector->>Wazuh: Vector sinks the enriched events into RSyslog using tcp connection
   Wazuh->>+Wazuh: RSyslog logs<br/>events from Resilmesh
   Wazuh->>Wazuh: Wazuh Agent<br/>collects logs
   NATS->>MISP-Client: MISP API Client subscribed to 'enriched_events' queue 
   MISP-Client->>MISP: push events
```

## Requirements
We will need Docker with Compose, see [Install Docker Compose](https://docs.docker.com/compose/install/)

## Installation
1. Clone this repo: `git clone https://github.com/resilmesh2/Docker-Compose.git --recurse-submodules`
2. Create .env file and add the following, replacing the values enclosed by < >:
```dotenv
# Add this only if you're behind a proxy!
# i.e.: http_proxy=http://jao:secret@192.168.0.254:8080
http_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>
https_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>
```
3. There are some config files we need, follow instructions at [README.md](./Wazuh/README.md)
4. Follow the README's in the other containers to set them up:
   - [Vector](Vector/README.md)
   - [MISP](MISP/README.md)
   - [Silent Push - Enrichment](Enrichment/README.md)

## Datasets
The datasets included in this repository are for demonstration purpose only, the real ones used in production need to be copied into Vector/datasets folder, replacing the sample ones.

If you need to add more datasets, check [Vector](Vector/README.md) for instructions.

## Build and Run the containers
```shell
docker compose up -f production.yml -d
```

## Support
Ping if you need any further help: <Jorgeley [jorgeley@silentpush.com](jorgeley@silentpush.com)>
