/**
 * Single source of truth for all test container images.
 */

// Use N8N_DOCKER_IMAGE env var if set, otherwise default to 'n8nio/n8n:local'
const n8nImage = process.env.N8N_DOCKER_IMAGE ?? 'n8nio/n8n:local';

// Derive the task runner image from the n8n image for consistency
// e.g., 'n8nio/n8n:local' -> 'n8nio/runners:local'
// e.g., 'ghcr.io/n8n-io/n8n:pr-123' -> 'ghcr.io/n8n-io/runners:pr-123'
function getTaskRunnerImage(): string {
	// Allow explicit override via env var
	if (process.env.N8N_RUNNERS_IMAGE) {
		return process.env.N8N_RUNNERS_IMAGE;
	}
	return n8nImage.replace(/\/n8n:/, '/runners:');
}

export const TEST_CONTAINER_IMAGES = {
	postgres: 'postgres:18-alpine',
	redis: 'redis:alpine',
	caddy: 'caddy:alpine',
	n8n: n8nImage,
	taskRunner: getTaskRunnerImage(),
	mailpit: 'axllent/mailpit:latest',
	mockserver: 'mockserver/mockserver:5.15.0',
	gitea: 'gitea/gitea:1.25.1',
	keycloak: 'keycloak/keycloak:26.4',
	// VictoriaObs stack for test observability
	victoriaLogs: 'victoriametrics/victoria-logs:v1.21.0-victorialogs',
	victoriaMetrics: 'victoriametrics/victoria-metrics:v1.115.0',
	// Log collector for container logs
	vector: 'timberio/vector:0.52.0-alpine',
	// Tracing stack for workflow execution visualization
	n8nTracer: 'ghcr.io/ivov/n8n-tracer:0.1.0',
	jaeger: 'jaegertracing/all-in-one:1.76.0',
	cloudflared: 'cloudflare/cloudflared:2025.1.1',
	// Kafka for message queue testing
	kafka: 'confluentinc/cp-kafka:8.0.3',
} as const;
