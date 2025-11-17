# Vector

## Introduction
Vector is our observability pipeline, it connects everything, since the datasets to the integrations.
In addition, we have some custom modules, which are basically subscribers to the NATS queues doing some extra work.

## Architecture
Vector works by pulling data from a source, transforming it (processing, parsing, etc) and sinking (pushing) it somewhere.
This is what we have so far:
```text
|           SOURCES                  TRANSFORMS            SINKS                   |
|                                                                                  |
|     [   0_csv_datasets   ] --> [   1_dedupe_csv  ] --> [2_deduped_csv_queue] --  |
| --> [3_deduped_csv_events] --> [ 4_csv_normalizer] --> [5_normalized_queue ] --  |
| --> [ 6_normalized_events] --> [   7_format_ecs  ] --> [8_enrichment_queue ] --  |
| --> [ 9_enriched_events  ] --> [ 10_format_syslog] --> [     11_rsyslog    ]     |
```

## Configuration
The end of the pipeline is a RSyslog server, which has a Wazuh Agent to send the events to Wazuh.
You need to create a .env file and add the following, replacing the values if necessary:
```dotenv
RSYSLOG_HOST=host.docker.internal
RSYSLOG_PORT=10514
```
you can test the connectivity from the container, just in case use `telnet host.docker.internal 10514` or `nc host.docker.internal 10514`

## Extending the datasets
There's only one requirement: **the datasets need to comply with [ECS](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) format**.

If you wish to use your own datasets, there are 2 ways for that:
### if the datasets are already in ECS format
- add them into the sources folder, follow this example:
    ```yaml
    # my_ecs_datasets.yml
    type: "file"
    include:
      - "/etc/vector/datasets/my_ECS_dataset.json"
      - "/etc/vector/datasets/my_other_ECS_dataset.json"
    ```
  Of course the datasets don't need to be static files, you can use any source supported by Vector, see: https://vector.dev/docs/reference/configuration/sources/
- add the previous source as an input to the **[8_enrichment_queue.yaml](sinks/8_enrichment_queue.yaml)**:
    ```yaml
    inputs: [ "7_format_ecs", "my_ecs_datasets" ]
    ```
### if the datasets are not in ECS format
Well, in this case you'll have to remap them to comply with ECS format, Vector can do that easily, there's an example in [7_format_ecs.yaml](transforms/7_format_ecs.yaml) using VRL, see: https://vector.dev/docs/reference/configuration/transforms/remap/

After you guarantee the datasets are ECS compatible, simply add them as an input to the **[8_enrichment_queue.yaml](sinks/8_enrichment_queue.yaml)** file.

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
