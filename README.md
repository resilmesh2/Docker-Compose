# ResilMesh — Cyber Situational Awareness (CSA) Platf
ResilMesh is a Horizon Europe Innovation Action focused on cybersecurity resilience for critical infrastructures through Cyber Situational Awareness (CSA): collect security-relevant telemetry, correlate and enrich it, assess risk at asset/service level, and orchestrate mitigation actions across heterogeneous IT/OT environments.

“You can’t protect what you don’t understand.” ResilMesh operationalizes that principle by linking data → detection → context/risk → response in an integrated, plane-based architecture.

**ResilMesh System v2 provides:** 
- A plane-based, modular architecture (Aggregation & Collaboration, Threat Awareness, Situation Assessment, Security Operations). 
- Improved deployability via a restructured GitHub layout and cascading Docker Compose execution. 
- Automated deployment for on-prem and AWS (scripts + Terraform-based AWS testbed).

## High-level architecture
ResilMesh is organized into interdependent functional planes. 

1) Aggregation & Collaboration Plane
Pre-processes, normalizes, enriches, and brokers data between components: 
- Vector: telemetry collection/transformation/routing. 
- NATS: high-performance message broker/event bus. 
- SLP Enrichment: Silent Push enrichment for IoCs (domain/IP) with buffering/publishing patterns to avoid slow consumers. 
- MISP Client: consumes events from NATS, normalizes, and pushes CTI to MISP Server.

2) Threat Awareness Plane
Detection, monitoring, correlation, CTI & hunting: 
- Wazuh Server (SIEM): collection/analysis of logs and alerts. 
- AIC (AI Correlation): correlation/pruning/RCA to reduce alert overload and add context. 
- AIBD (AI-Based Detector): multi-view ML for heterogeneous IT/OT anomaly/attack detection (planned for advanced Pilot 2 phases). 
- FLAD (Federated Learning Anomaly Detector): real-time detection/classification using federated learning (validated in specific pilot environments). 
- RCTI: robust CTI with IoB (Indicator of Behaviour), PP-CTI (privacy-preserving sharing), and MISP Server. 
- THF/DFIR: threat hunting and forensics with AI-assisted workflows and reporting.

3) Situation Assessment Plane
Contextualizes threats into system/service risk: 
- CASM: automated internal/external attack surface scanning and vulnerability acquisition (NVD), orchestrated with Temporal-based workflows. 
- ISIM (Neo4j): central graph model storing assets/services/vulns/dependencies (REST + GraphQL). 
- CSA (Critical Service Awareness): maps missions/services and computes asset criticality using ISIM + network centrality inputs. 
- NSE: network-wide risk aggregation + projection (current & future posture). 
- NDR: traffic analysis + anomaly detection + RCA + XAI. 
- SACD: consolidated dashboard UI for SA data. 
- AIBAST: AI-driven automated security testing (planned for later Pilot 2 phases). 
- Landing Page: entry point linking to platform services.

4) Security Operations Plane
Turns intelligence into mitigation actions: 
- MM (Mitigation Manager): selects optimal response playbook using situational context (e.g., ISIM) and rule-based reasoning. 
- PT (Playbooks Tool): executes mitigation workflows / Courses of Action (CoAs). 
- WO (Workflow Orchestrator): runs complex automation workflows and provides feedback loops to MM.

## Repository layout (v2)
ResilMesh v2 aligns GitHub layout with the plane-based architecture: 
- A main Docker Compose repository at the top level. 
- Plane-level submodules nested beneath: 
  - Aggregation/ 
  - Threat-Awareness/ 
  - Situation-Assessment/ 
  - Security-Operations/ 
- Each plane contains component repositories + compose definitions. 
- Top-level compose files include plane compose files to enable cascading deployments.

## Deployment
ResilMesh v2 supports: 
- On-premises Linux (Docker + Docker Compose installed) 
- AWS Cloud (Terraform provisions infra + bootstrap; then scripts deploy the platform)

**Important:** visit the Resilmesh installation guide for fully deplyment details: `https://awscloud-deployment.readthedocs.io/en/latest/#`

### Prerequisites
- Linux host (on-prem) or provisioned AWS EC2 host
- Docker + Docker Compose
- Network access to required ports (restricted to authorized IPs recommended)
- Component-specific keys if enabling enrichment/hunting tooling (e.g., enrichment API keys)
- Run deployment menu (recommended)

### Running the platform
```
cd Docker-Compose/Scripts
chmod +x init.sh
./init.sh
```

**The script typically:** 
- optionally configures proxy settings, 
- prompts for deployment type (Domain / IT / IoT / Full), 
- generates .env files per component from templates, 
- prepares a shared Docker network, 
- executes the appropriate compose stack in a cascading manner.

**Important, see** `https://github.com/resilmesh2/AWSCloud-Deployment` for instructions.

**Common services (typical)**
Depending on the selected deployment profile, common services may include: 
- Wazuh, MISP 
- SACD, CASM, ISIM (Neo4j + GraphQL), NSE, NDR 
- Workflow Orchestrator, Playbooks Tool 
- PP-CTI UI/API, IoB tooling, THF/DFIR UIs 
- Landing Page as the platform entry point

URLs/ports depend on the selected environment profile and whether the deployment is AWS (Elastic IP) or on-prem (server IP).

#### Manual compose execution (examples)
**Full Platform**
`docker compose -f docker-compose-Full_platform.yml up -d`

**IT Domain**
`docker compose -f docker-compose-IT_Domain.yml up -d`

**IoT Domain**
`docker compose -f docker-compose-IoT_Domain.yml up -d`

**Domain**
`docker compose -f docker-compose-Domain.yml up -d`

## AWS Cloud testbed (Terraform)
Typical AWS deployment includes: 
- VPC + subnet + IGW + routing 
- Security Groups restricted to explicit admin IPs 
- EC2 instance with bootstrap (user_data) that installs dependencies and clones repositories 
- EBS encryption at rest 
- IAM roles with least privilege (e.g., SSM-managed instance access)


**Security notes**
- Use IP-restricted Security Groups / firewall rules for all exposed services.
- Prefer SSH keys and disable password auth where possible.
- Rotate default passwords and secrets before any production-like usage.
- Treat API keys and tokens as secrets; never commit them.

## Contact / contributions
This repository is part of the ResilMesh ecosystem. If you are a project partner and need access to specific components, keys, or deployment profiles, follow the internal onboarding instructions agreed within the consortium.