#!/usr/bin/env bash
# Produce N sequenced messages to the demo topic.
#   ./produce.sh 1000 [prefix]
set -euo pipefail
COUNT="${1:-100}"
PREFIX="${2:-msg}"

seq 1 "$COUNT" | sed "s/^/${PREFIX}-/" | docker exec -i n8n-poc-kafka-1 \
  /opt/bitnami/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic poc-events >/dev/null
echo "[produce] sent $COUNT messages ($PREFIX-1..$PREFIX-$COUNT)"
