#!/bin/bash

set -e  # Exit on any error

# Configuration
NODE_VERSION=20
DOCKER_PLATFORMS="linux/amd64,linux/arm64"

# Define the env variables
export DOCKER_USERNAME='admin@feeba.io'
export DOCKER_PASSWORD='$d2flcX3peYI'

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting release process...${NC}"

# Get git SHA for versioning
GIT_SHA=$(git rev-parse --short HEAD)
echo "Building with Git SHA: ${GIT_SHA}"

1. Docker Publishing
echo -e "${GREEN}1. Building and publishing Docker images...${NC}"
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
    # Login to Docker registries
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    # Set image name and tag
    IMAGE_NAME="feeba/numeo-n8n-custom"
    IMAGE_TAG="${GIT_SHA}"
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

    echo "Building image: ${FULL_IMAGE_NAME}"

    # Build and push Docker images
    docker buildx create --use
    docker buildx build \
        --platform linux/amd64 \
        --build-arg N8N_VERSION=$GIT_SHA \
        --file ./docker/images/n8n-custom/Dockerfile \
        --tag ${FULL_IMAGE_NAME} \
        --push \
        .

    echo -e "${GREEN}Successfully built and pushed: ${FULL_IMAGE_NAME}${NC}"
else
    echo "Docker credentials not set, skipping Docker publish"
fi

# 3. Gcloud deploy
echo -e "${GREEN}3. Deploying to Gcloud...${NC}"
# Build and push Gcloud images
gcloud run deploy n8n \
    --image feeba/numeo-n8n-custom:7cfe8142b7 \
    --region us-central1 \
    --platform managed
