#!/usr/bin/env bash
# Produce N sequenced messages to the demo topic.
#   ./produce.sh 1000 [prefix]
set -euo pipefail
COUNT="${1:-100}"
PREFIX="${2:-msg}"

# Keyed messages, so the partitioner spreads them across partitions (a
# null-key producer sticks whole batches to one partition, defeating the
# multi-replica demo).
seq 1 "$COUNT" | sed "s/^\(.*\)$/${PREFIX}-\1|${PREFIX}-\1/" | docker exec -i n8n-poc-kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic poc-events \
  --property parse.key=true --property key.separator='|' >/dev/null
echo "[produce] sent $COUNT messages ($PREFIX-1..$PREFIX-$COUNT)"
