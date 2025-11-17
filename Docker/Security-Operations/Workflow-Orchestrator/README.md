# Workflow-Orchestrator
This repository contains a workflow orchestrator that is implemented using docker containers 
for Temporal. Components that could provide workflows orchestrated by this orchestrator in the future
should implement their workers that interact with Temporal.

## How to Run
### Prerequisites
Docker and docker compose must be set up in your system. We used versions specified in section 
[Versions Used During Testing](#versions-used-during-testing).

### Commands
The containers can be started using

```bash
docker compose up -d
```

Temporalio server should be available at http://localhost:8080/. You can watch the progress of your workflows there, or look for errors
if any problems occur. You can also create a scheduled workflow there.

## Structure of compose.yml file

The compose file contains several containers. `temporal-ui` is the user interface available on port 8080.
`temporal` container available on port 7233 is the container with which custom workers interact. Other
containers have supporting roles.

# How to create workers
This repository provides only a workflow orchestrator, but it is necessary to implement own workers.
The implementation of your worker will usually have three source files for the type of workflow you plan 
to implement:
- `activities.py` containing activities,
- `worker.py` containing a worker,
- `workflow.py` containing workflows.

The worker is responsible for setting a task queue, allowed workflows, activities and runner. Each workflow
should represent a set of activities that should be executed. Each workflow should define run() method.
Inspiration on how to create activities, worker, and workflows can be found in `temporal` folder in
the [CASM repository](https://github.com/resilmesh2/CASM).

There are two types of workers in CASM - without a schedule (e.g., Nmap) and with a schedule 
(e.g., SLP enrichment). Workers without scheduling
a workflow require user to execute the workflow from a command line or from UI. Workers that schedule a workflow
do not require a user to execute the workflow. The schedule can be found in the Temporal UI, in the section
dedicated for schedules.

# Versions Used During Testing
CASM was successfully tested with the following OS configuration and docker versions. 

|Operating System|Docker Version|Docker Compose Version| Memory |CPU Architecture|Number of Cores|
|----------------|--------------|----------------------|--------|----------------|---------------|
|Ubuntu 24.04.2 LTS|28.3.3|v2.39.1|64.0 GiB|x86_64|16|
