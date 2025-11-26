/**
 * Single source of truth for all test container images.
 */

// Use N8N_DOCKER_IMAGE env var if set, otherwise default to 'n8nio/n8n:local'
const n8nImage = process.env.N8N_DOCKER_IMAGE ?? 'n8nio/n8n:local';

export const TEST_CONTAINER_IMAGES = {
	postgres: 'postgres:18-alpine',
	redis: 'redis:alpine',
	caddy: 'caddy:alpine',
	n8n: n8nImage,
	taskRunner: 'n8nio/runners:nightly',
	mailpit: 'axllent/mailpit:latest',
	mockserver: 'mockserver/mockserver:5.15.0',
	gitea: 'gitea/gitea:1.25.1',
} as const;
