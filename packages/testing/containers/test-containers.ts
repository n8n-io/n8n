/**
 * Single source of truth for all test container images.
 *
 * All images can be overridden via environment variables:
 *   TEST_IMAGE_<KEY> where KEY is the SCREAMING_SNAKE_CASE version of the image key
 *   e.g., TEST_IMAGE_POSTGRES=postgres:16 overrides the postgres image
 *   e.g., TEST_IMAGE_N8N=n8nio/n8n:latest overrides the n8n image
 *   e.g., TEST_IMAGE_TASK_RUNNER=n8nio/runners:latest overrides the task runner image
 *
 * For n8n image, shorthand syntax is supported:
 *   TEST_IMAGE_N8N=stable         → n8nio/n8n:stable
 *   TEST_IMAGE_N8N=n8n:stable     → n8nio/n8n:stable
 *   TEST_IMAGE_N8N=n8nio/n8n:stable → n8nio/n8n:stable
 *
 * Task runner image derivation:
 *   When TEST_IMAGE_TASK_RUNNER is not set, the image is derived from the n8n image:
 *   TEST_IMAGE_N8N=n8nio/n8n:nightly              → taskRunner=n8nio/runners:nightly
 *   TEST_IMAGE_N8N=ghcr.io/n8n-io/n8n:pr-123      → taskRunner=ghcr.io/n8n-io/runners:pr-123
 *
 * N8N_DOCKER_IMAGE is also supported for backwards compatibility.
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
	ngrok: 'ngrok/ngrok:alpine',
	kafka: 'confluentinc/cp-kafka:8.0.3',
	mysql: 'mysql:9.6.0',
	localstack: 'localstack/localstack:latest',
} as const;

/** Convert camelCase to SCREAMING_SNAKE_CASE for env var names */
function toEnvVarName(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/** Normalize n8n image shorthand: "stable" → "n8nio/n8n:stable" */
function normalizeN8nImage(image: string): string {
	if (image.includes('/')) return image;
	if (image.includes(':')) return `n8nio/${image}`;
	return `n8nio/n8n:${image}`;
}

/** Parse "ghcr.io/n8n-io/n8n:pr-123" or "n8nio/n8n:nightly" into components */
function parseImage(image: string): { registry?: string; org: string; tag: string } {
	const [imagePath, tag = 'latest'] = image.split(':');
	const parts = imagePath.split('/');

	if (parts.length === 3) {
		return { registry: parts[0], org: parts[1], tag };
	}
	return { org: parts[0], tag };
}

/** Derive runners image from n8n image components */
function buildRunnersImage({ registry, org, tag }: ReturnType<typeof parseImage>): string {
	return registry ? `${registry}/${org}/runners:${tag}` : `${org}/runners:${tag}`;
}

let resolvedN8nImage: string | undefined;

/** Get image with TEST_IMAGE_<KEY> env var override support */
function getImage<K extends keyof typeof DEFAULT_IMAGES>(key: K): string {
	const envVar = `TEST_IMAGE_${toEnvVarName(key)}`;
	let value = process.env[envVar];

	if (key === 'n8n' && !value) {
		value = process.env.N8N_DOCKER_IMAGE;
	}

	if (key === 'taskRunner' && !value) {
		resolvedN8nImage ??= getImage('n8n');
		return buildRunnersImage(parseImage(resolvedN8nImage));
	}

	value = value ?? DEFAULT_IMAGES[key];

	if (key === 'n8n') {
		resolvedN8nImage = normalizeN8nImage(value);
		return resolvedN8nImage;
	}

	return value;
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
	kafka: getImage('kafka'),
	mysql: getImage('mysql'),
	ngrok: getImage('ngrok'),
	localstack: getImage('localstack'),
} as const;
