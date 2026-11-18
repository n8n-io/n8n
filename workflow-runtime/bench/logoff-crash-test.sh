#!/usr/bin/env bash
# Crash test for the log offload (docs/log-offload.md): start wfrt with
# --log-offload on, send webhook requests, kill -9, restart, and check that
# every reply that arrived before the kill is in the recovered log.
# Runs the same rounds with --log-offload off as the control.
# Usage: bench/logoff-crash-test.sh [rounds]
set -euo pipefail
cd "$(dirname "$0")/.."
zig build -Drelease=true
node bench/logoff-crash/run.mjs "${1:-30}"