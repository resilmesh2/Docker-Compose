#!/bin/bash

OPENSEARCH_URL="https://your-opensearch-url:9200" # opensearch use port 9200 to work with datasets
AUTH_HEADER="username:password"  # Update if needed
Local_powershell_data="local-powershell.json"
lsass_data="lsass-memory-read-access.json"
remote_powershell="power-remote-session.json"
wmi="wmi-evening.json"
INDEX_NAME_LOCAL="local-powershell"
INDEX_NAME_LSASS="lsass-memory-read-access"
INDEX_NAME_REMOTE="powershell-remote-session"
INDEX_NAME_WMI="wmi-eventing"





#  Upload Data to the Index
echo "Uploading data to index $INDEX_NAME_LOCAL..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_LOCAL/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$Local_powershell_data"


echo "Uploading data to index $INDEX_NAME_LSASS..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_LSASS/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$lsass_data"


echo "Uploading data to index $INDEX_NAME_REMOTE..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_REMOTE/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$remote_powershell"


echo "Uploading data to index $INDEX_NAME_WMI..."
curl -v -k -u "$AUTH_HEADER" -X POST "$OPENSEARCH_URL/$INDEX_NAME_WMI/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @"$wmi"


echo "Installation completed successfully."