#!/bin/bash

OPENSEARCH_URL="https://your-opensearch-url:9200" # opensearch use port 9200 to work with datasets
AUTH_HEADER="username:password"  # Update if needed
node="node-graph.json"
wazuhalert="wazuh-alerts.json"
INDEX_NAME_NODE="node-graph"
INDEX_NAME_ALERT="wazuh-alert"


#  Upload Data to the Index

echo "Uploading data to index $INDEX_NAME_NODE..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_NODE/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$node"

echo "Uploading data to index $INDEX_NAME_ALERT..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_ALERT/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$wazuhalert"

echo "Installation completed successfully."
