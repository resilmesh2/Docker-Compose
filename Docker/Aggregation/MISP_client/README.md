# MISP

## Introduction
This is a MISP Client API responsible for pushing events from Resilmesh Framework into a MISP instance.


_see_: https://www.misp-project.org/

## Dependencies
This container is part of the Resilmesh Framework and depends on the other following containers:
- [Vector](../Vector/README.md)
- [NATS](../NATS/README.md)
- [Silent Push - Enrichment](../Enrichment/README.md)

Also, depends on a MISP instance, see the next step.

## Installation
You'll need a MISP instance up and running.
1. You can use the official VM image at https://vm.misp-project.org/latest/
2. Set an API Key in your MISP instance, so we can use it here, follow the instructions at https://www.circl.lu/doc/misp/automation/#automation-key

That's it, copy the API key, we need it in the next steps.

## Configuration
With the API key copied in the previous step, create an .env file with the following contents:
```dotenv
MISP_API_KEY="<YOUR API KEY>"
MISP_API_URL="https://<YOUR MISP SERVER IP>:8443"
NATS_URL="nats://nats:4222"
SUBSCRIBE_SUBJECT="enriched_events"
SUBSCRIBE_QUEUE="misp_queue"
MISP_CERTIFICATE_VERIFY=0
LOG_FILE="misp_client.log"
```

## Run the container
Standalone:
```shell
docker up -d
```
If you're running with docker compose:
```shell
docker compose -f production.yml up -d
```

## Support
Ping if you need any further help: <Jorgeley [jorgeley@silentpush.com](jorgeley@silentpush.com)>
