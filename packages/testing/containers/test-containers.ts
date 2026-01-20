/**
 * Single source of truth for all test container images.
 *
 * All images can be overridden via environment variables:
 *   TEST_IMAGE_<KEY> where KEY is the SCREAMING_SNAKE_CASE version of the image key
 *   e.g., TEST_IMAGE_POSTGRES=postgres:16 overrides the postgres image
 *   e.g., TEST_IMAGE_N8N=n8nio/n8n:latest overrides the n8n image
 *   e.g., TEST_IMAGE_TASK_RUNNER=n8nio/runners:latest overrides the task runner image
 */

/** Default images - override via TEST_IMAGE_<KEY> env vars */
const DEFAULT_IMAGES = {
	postgres: 'postgres:18-alpine',
	redis: 'redis:alpine',
	caddy: 'caddy:alpine',
	n8n: 'n8nio/n8n:local',
	taskRunner: 'n8nio/runners:local',
	mailpit: 'axllent/mailpit:latest',
	mockserver: 'mockserver/mockserver:5.15.0',
	gitea: 'gitea/gitea:1.25.1',
	keycloak: 'keycloak/keycloak:26.4',
	victoriaLogs: 'victoriametrics/victoria-logs:v1.21.0-victorialogs',
	victoriaMetrics: 'victoriametrics/victoria-metrics:v1.115.0',
	vector: 'timberio/vector:0.52.0-alpine',
	n8nTracer: 'ghcr.io/ivov/n8n-tracer:0.1.0',
	jaeger: 'jaegertracing/all-in-one:1.76.0',
	cloudflared: 'cloudflare/cloudflared:2025.1.1',
} as const;

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE for env var names
 * e.g., victoriaLogs -> VICTORIA_LOGS, taskRunner -> TASK_RUNNER
 */
function toEnvVarName(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/**
 * Get image with env var override support
 * Checks TEST_IMAGE_<KEY> env var, falls back to default
 */
function getImage<K extends keyof typeof DEFAULT_IMAGES>(key: K): string {
	const envVar = `TEST_IMAGE_${toEnvVarName(key)}`;
	return process.env[envVar] ?? DEFAULT_IMAGES[key];
}

export const TEST_CONTAINER_IMAGES = {
	postgres: getImage('postgres'),
	redis: getImage('redis'),
	caddy: getImage('caddy'),
	n8n: getImage('n8n'),
	taskRunner: getImage('taskRunner'),
	mailpit: getImage('mailpit'),
	mockserver: getImage('mockserver'),
	gitea: getImage('gitea'),
	keycloak: getImage('keycloak'),
	victoriaLogs: getImage('victoriaLogs'),
	victoriaMetrics: getImage('victoriaMetrics'),
	vector: getImage('vector'),
	n8nTracer: getImage('n8nTracer'),
	jaeger: getImage('jaeger'),
	cloudflared: getImage('cloudflared'),
} as const;
