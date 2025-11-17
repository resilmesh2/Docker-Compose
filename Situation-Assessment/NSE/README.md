NetworkVisualisationDashboard

This project was generated using Angular CLI (https://github.com/angular/angular-cli) version 19.2.3.

LOCAL DEVELOPMENT SERVER

To start a local development server, run:

First run NPM i or NPM install to download dependencies
npm install

npm start

Once the server is running, open your browser and navigate to http://localhost:4201/. The application will automatically reload whenever you modify any of the source files.

DOCKER DEPLOYMENT

Prerequisites
- Docker and Docker Compose installed on your system
- Neo4j database running and accessible
- OpenSearch/Wazuh instance configured (for threat calculations)

Environment Configuration

Create a .env file in the project root with the following variables:

NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
OS_HOST=https://192.168.200.123:9200
OS_USER=admin
OS_PASSWORD=admin
OS_INDEX=wazuh-alerts-*

Starting the Application

To start the entire application stack with Docker:

docker-compose up -d

This will start:
- Angular frontend (accessible at http://localhost:4201)
- Flask Risk API (accessible at http://localhost:5000)
- Automated calculation services (threat_calcs.py, isim_calcs.py, automations)

Stopping the Application

docker-compose down

Viewing Logs

To view logs for all services:
docker-compose logs -f

To view logs for a specific service:
docker-compose logs -f risk-api
docker-compose logs -f frontend

Rebuilding After Changes

If you make changes to the code, rebuild the containers:

docker-compose build
docker-compose up -d

Manual Calculation Triggers

You can manually trigger calculations even when running in Docker:

For threat scores:
docker exec -it risk-api python /app/threat_calcs.py

For CVSS, criticality, and risk scores:
docker exec -it risk-api python /app/isim_calcs.py

For automation execution:
docker exec -it risk-api python /app/execute_automations.py

For component automation execution:
docker exec -it risk-api python /app/execute_component_automation.py

Accessing Configuration Files

Configuration files are mounted as volumes in Docker. To edit them:

Risk assessment config:
/config/risk_assessment_config.yaml

Component automation config:
/config/component_automation_config.yaml

After editing configs, restart the risk-api container:
docker-compose restart risk-api

CODE SCAFFOLDING

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

ng generate component component-name

For a complete list of available schematics (such as components, directives, or pipes), run:

ng generate --help

BUILDING

To build the project run:

ng build

This will compile your project and store the build artifacts in the dist/ directory. By default, the production build optimizes your application for performance and speed.

CUSTOMIZING RISK COMPONENT CALCULATIONS

The system includes several base risk components (CVSS scores, threat scores, criticality) that are calculated automatically. You can customize how these components are calculated by modifying the appropriate backend files.

CVSS Score Calculation

File to modify: isim_calcs.py
Current behavior: Calculates the AVERAGE of all CVE base scores for a node
Location in file: Look for the query labeled "Set CVSS score on Nodes" 

Current implementation uses avg(c.base_score_v3):

set_cvss_query = """
MATCH (n:Node)-[:IS_A]->(h:Host)
      <-[:ON]-(sv:SoftwareVersion)
      <-[:IN]-(v:Vulnerability)
      -[:REFERS_TO]->(c:CVE)
WHERE c.base_score_v3 IS NOT NULL
WITH n, avg(c.base_score_v3) AS avgCvss
SET n.cvss_score = avgCvss
RETURN count(n) AS nodesUpdated,
       round(avg(avgCvss),2) AS globalAverageCvss
"""

To use MAXIMUM instead of AVERAGE:

Replace avg(c.base_score_v3) with max(c.base_score_v3):

set_cvss_query = """
MATCH (n:Node)-[:IS_A]->(h:Host)
      <-[:ON]-(sv:SoftwareVersion)
      <-[:IN]-(v:Vulnerability)
      -[:REFERS_TO]->(c:CVE)
WHERE c.base_score_v3 IS NOT NULL
WITH n, max(c.base_score_v3) AS maxCvss
SET n.cvss_score = maxCvss
RETURN count(n) AS nodesUpdated,
       round(avg(maxCvss),2) AS globalAverageCvss
"""

Other aggregation options:
- min(c.base_score_v3) - Use minimum score
- sum(c.base_score_v3) - Sum all scores (may exceed 10)
- collect(c.base_score_v3)[0] - Use first score only

Threat Score Calculation

File to modify: threat_calcs.py
Current behavior: Uses weighted average, maximum score, and 90th percentile with volume factor
Location in file: calculate_threat_scores method

Current calculation combines multiple factors:

final_score = (weighted_avg * 0.4) + (max_score * 0.3) + (percentile_90 * 0.3)
volume_factor = min(1.2, 1 + (alert_count / 10000))
final_score = min(10.0, final_score * volume_factor)

To use MAXIMUM alert level only:

final_score = max_score

To use AVERAGE without volume factor:

final_score = weighted_avg

To adjust weighting factors:

Modify the multipliers (must sum to 1.0):

Example: Prioritize maximum score more heavily
final_score = (weighted_avg * 0.2) + (max_score * 0.6) + (percentile_90 * 0.2)

Criticality Score Calculation

File to modify: isim_calcs.py
Current behavior: Averages normalized betweenness and degree centrality, scaled to 0-10
Location in file: Look for "Calculate average criticality" query 

Current implementation averages betweenness and degree:

average_criticality_query = """
MATCH (n:Node)
WHERE n.normalizedBetweenness IS NOT NULL
  AND n.normalizedDegree IS NOT NULL
WITH n, (n.normalizedBetweenness + n.normalizedDegree) / 2.0 AS avgNorm
SET n.criticality = avgNorm * 10.0
RETURN count(n) AS nodesUpdated,
       round(avg(avgNorm * 10.0), 2) AS avgCriticality
"""

To weight betweenness more heavily:

average_criticality_query = """
MATCH (n:Node)
WHERE n.normalizedBetweenness IS NOT NULL
  AND n.normalizedDegree IS NOT NULL
WITH n, (n.normalizedBetweenness * 0.7 + n.normalizedDegree * 0.3) AS weightedNorm
SET n.criticality = weightedNorm * 10.0
RETURN count(n) AS nodesUpdated,
       round(avg(weightedNorm * 10.0), 2) AS avgCriticality
"""

To use MAXIMUM of betweenness or degree:

average_criticality_query = """
MATCH (n:Node)
WHERE n.normalizedBetweenness IS NOT NULL
  AND n.normalizedDegree IS NOT NULL
WITH n, CASE 
    WHEN n.normalizedBetweenness > n.normalizedDegree 
    THEN n.normalizedBetweenness 
    ELSE n.normalizedDegree 
END AS maxNorm
SET n.criticality = maxNorm * 10.0
RETURN count(n) AS nodesUpdated,
       round(avg(maxNorm * 10.0), 2) AS avgCriticality
"""

Final Risk Score Calculation

File to modify: isim_calcs.py
Current behavior: Weighted average of CVSS (40%), threat (30%), and criticality (30%)
Location in file: Look for "Calculate final Risk Score" query

Current implementation:

risk_score_query = """
MATCH (n:Node)
WHERE n.cvss_score IS NOT NULL 
  OR n.threatScore IS NOT NULL 
  OR n.criticality IS NOT NULL
WITH n,
  COALESCE(n.cvss_score, 0.0) AS cvss,
  COALESCE(n.threatScore, 0.0) AS threat,
  COALESCE(n.criticality, 0.0) AS crit
SET n.`Risk Score` = (cvss * 0.4) + (threat * 0.3) + (crit * 0.3)
RETURN count(n) AS nodesUpdated,
       round(avg(n.`Risk Score`), 2) AS avgRiskScore,
       round(max(n.`Risk Score`), 2) AS maxRiskScore
"""

To adjust component weights:

Modify the multipliers (should sum to 1.0):

Example: Prioritize CVSS and threat scores
SET n.`Risk Score` = (cvss * 0.5) + (threat * 0.4) + (crit * 0.1)

To use MAXIMUM of all components:

SET n.`Risk Score` = CASE 
    WHEN cvss >= threat AND cvss >= crit THEN cvss
    WHEN threat >= cvss AND threat >= crit THEN threat
    ELSE crit
END

Applying Changes

After modifying any of these files:

1. Restart the Flask API container:
docker-compose restart risk-api

2. Manually trigger recalculation:
For threat scores: docker exec -it risk-api python /app/threat_calcs.py
For CVSS, criticality, and risk scores: docker exec -it risk-api python /app/isim_calcs.py

3. Changes will be automatically applied on the next scheduled run (check crontab for schedule)

AUTOMATED CALCULATIONS SCHEDULE

The system runs automated calculations on a cron schedule defined in the crontab file:

- Automation checks: Every minute
- Component automation checks: Every minute
- Threat calculations: Every 2 hours at 10 minutes past the hour (e.g., 00:10, 02:10, 04:10)
- ISIM calculations: Every 2 hours at 20 minutes past the hour (e.g., 00:20, 02:20, 04:20)

To modify the schedule, edit the crontab file and rebuild the Docker container.

IMPORTANT NOTES

- Always backup configuration files before making changes
- Test changes on a non-production environment first
- Ensure Neo4j properties match the ones referenced in queries
- Component scores should remain in the 0-10 range for consistency
- Weights in weighted averages should sum to 1.0 for proper scaling
- Configuration files persist across container restarts when using Docker volumes
- Log files are stored in /app/logs/ directory inside the container