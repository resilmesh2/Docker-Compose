# Silent Push - Enrichment

## Introduction
This is a Silent Push Client API responsible for enriching events from the Resilmesh Framework.

Silent Push is a proprietary scanning and aggregation engine, using first-party data that logs changes across the entire IPv4 space, and provides security teams with pre-evaluated data and query functionality that simply isn’t available anywhere else on the Internet.
**"We know first"**

_see_: https://www.silentpush.com/

## Dependencies
This container is part of the Resilmesh Framework and depends on the other following containers:
- [Vector](../Vector/README.md)
- [NATS](../NATS/README.md)

## Configuration
First you need an API key, contact <Maja Otic [motic@silentpush.com](motic@silentpush.com)> if you don't have one yet.

With the API key copied in the previous step, create an .env file with the following contents:
```dotenv
API_URL="https://app.silentpush.com/api/v1/merge-api/"
API_KEY="<YOUR SILENT PUSH API KEY>"
NATS_URL="nats://nats:4222"
SUBSCRIBE_SUBJECT="ecs_events"
SUBSCRIBE_QUEUE="enrichment_queue"
PUBLISH_SUBJECT="enriched_events"
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
