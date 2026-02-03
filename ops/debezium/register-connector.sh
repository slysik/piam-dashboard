#!/bin/bash
# Idempotent Debezium connector registration
set -e

CONNECT_HOST="${CONNECT_HOST:-localhost:8083}"
CONFIG_FILE="${CONFIG_FILE:-$(dirname "$0")/connector-config.json}"

echo "Waiting for Debezium Connect to be ready..."
until curl -s "http://${CONNECT_HOST}/connectors" > /dev/null 2>&1; do
  sleep 2
done

CONNECTOR_NAME=$(jq -r '.name' "$CONFIG_FILE")

# Check if connector exists
if curl -s "http://${CONNECT_HOST}/connectors/${CONNECTOR_NAME}" | grep -q '"name"'; then
  echo "Connector ${CONNECTOR_NAME} already exists, updating..."
  curl -X PUT -H "Content-Type: application/json" \
    -d "$(jq '.config' "$CONFIG_FILE")" \
    "http://${CONNECT_HOST}/connectors/${CONNECTOR_NAME}/config"
else
  echo "Creating connector ${CONNECTOR_NAME}..."
  curl -X POST -H "Content-Type: application/json" \
    -d @"$CONFIG_FILE" \
    "http://${CONNECT_HOST}/connectors"
fi

echo ""
echo "Connector status:"
curl -s "http://${CONNECT_HOST}/connectors/${CONNECTOR_NAME}/status" | jq .
