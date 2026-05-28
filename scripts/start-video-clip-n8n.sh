#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${VIDEO_CLIP_ENV_FILE:-$ROOT_DIR/.env.video-clip}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from .env.video-clip.example and fill in the Doubao TTS values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export VIDEO_CLIP_REPO_DIR="${VIDEO_CLIP_REPO_DIR:-$ROOT_DIR}"
export VIDEO_CLIP_JOBS_DIR="${VIDEO_CLIP_JOBS_DIR:-$ROOT_DIR/tmp/n8n-video-jobs}"
mkdir -p "$VIDEO_CLIP_JOBS_DIR"

cd "$ROOT_DIR"
pnpm start
