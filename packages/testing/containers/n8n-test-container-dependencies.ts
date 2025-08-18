import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { setTimeout as wait } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from './n8n-test-container-utils';

export async function setupRedis({
	redisImage,
	projectName,
	network,
}: {
	redisImage: string;
	projectName: string;
	network: StartedNetwork;
}): Promise<StartedTestContainer> {
	return await new RedisContainer(redisImage)
		.withNetwork(network)
		.withNetworkAliases('redis')
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': 'redis',
		})
		.withName(`${projectName}-redis`)
		.withReuse()
		.start();
}

export async function setupPostgres({
	postgresImage,
	projectName,
	network,
}: {
	postgresImage: string;
	projectName: string;
	network: StartedNetwork;
}): Promise<{
	container: StartedTestContainer;
	database: string;
	username: string;
	password: string;
}> {
	const postgres = await new PostgreSqlContainer(postgresImage)
		.withNetwork(network)
		.withNetworkAliases('postgres')
		.withDatabase('n8n_db')
		.withUsername('n8n_user')
		.withPassword('test_password')
		.withStartupTimeout(30000)
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': 'postgres',
		})
		.withName(`${projectName}-postgres`)
		.withReuse()
		.start();

	return {
		container: postgres,
		database: postgres.getDatabase(),
		username: postgres.getUsername(),
		password: postgres.getPassword(),
	};
}

/**
 * Setup NGINX for multi-main instances
 * @param nginxImage The Docker image for NGINX.
 * @param uniqueSuffix A unique suffix for naming and labeling.
 * @param mainInstances An array of running backend container instances.
 * @param network The shared Docker network.
 * @param nginxPort The host port to expose for NGINX.
 * @returns A promise that resolves to the started NGINX container.
 */
export async function setupNginxLoadBalancer({
	nginxImage,
	projectName,
	mainCount,
	network,
	port,
}: {
	nginxImage: string;
	projectName: string;
	mainCount: number;
	network: StartedNetwork;
	port: number;
}): Promise<StartedTestContainer> {
	// Generate upstream server entries from the list of main instances.
	const upstreamServers = Array.from(
		{ length: mainCount },
		(_, index) => `  server ${projectName}-n8n-main-${index + 1}:5678;`,
	).join('\n');

	// Build the NGINX configuration with dynamic upstream servers.
	// This allows us to have the port allocation be dynamic.
	const nginxConfig = buildNginxConfig(upstreamServers);

	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		return await new GenericContainer(nginxImage)
			.withNetwork(network)
			.withExposedPorts({ container: 80, host: port })
			.withCopyContentToContainer([{ content: nginxConfig, target: '/etc/nginx/nginx.conf' }])
			.withWaitStrategy(Wait.forListeningPorts())
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'nginx-lb',
			})
			.withName(`${projectName}-nginx-lb`)
			.withReuse()
			.withLogConsumer(consumer)
			.start();
	} catch (error) {
		return throwWithLogs(error);
	}
}

/**
 * Builds NGINX configuration for load balancing n8n instances
 * @param upstreamServers The upstream server entries to include in the configuration
 * @returns The complete NGINX configuration as a string
 */
function buildNginxConfig(upstreamServers: string): string {
	return `
  events {
    worker_connections 1024;
  }

  http {
    client_max_body_size 50M;
    access_log off;
    error_log /dev/stderr warn;

    # Map for WebSocket upgrades
    map $http_upgrade $connection_upgrade {
      default upgrade;
      ''      close;
    }

    upstream backend {
      # Use ip_hash for sticky sessions
      ip_hash;
      ${upstreamServers}
      keepalive 32;
    }

    server {
      listen 80;

      # Set longer timeouts for slow operations
      proxy_connect_timeout 60s;
      proxy_send_timeout  60s;
      proxy_read_timeout  60s;

      location / {
        proxy_pass http://backend;

        # Forward standard proxy headers
        proxy_set_header Host              $http_host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Forward WebSocket headers
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        $connection_upgrade;

        proxy_http_version 1.1;
        proxy_buffering    off;
      }

      # Specific location for real-time push/websockets
      location /rest/push {
        proxy_pass http://backend;

        # Forward standard proxy headers
        proxy_set_header Host              $http_host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Configure WebSocket proxying
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_http_version 1.1;

        # Disable buffering for real-time data
        proxy_buffering off;

        # Set very long timeouts for persistent connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
      }
    }
  }`;
}

/**
 * Builds Caddy configuration for load balancing n8n instances
 * @param upstreamServers Array of upstream server addresses
 * @returns The complete Caddyfile configuration as a string
 */
function buildCaddyConfig(upstreamServers: string[]): string {
	const backends = upstreamServers.join(' ');
	return `
:80 {
  # Reverse proxy with load balancing
  reverse_proxy ${backends} {
    # Enable sticky sessions using cookie
    lb_policy cookie

    # Health check (optional)
    health_uri /healthz
    health_interval 10s

    # Timeouts
    transport http {
      dial_timeout 60s
      read_timeout 60s
      write_timeout 60s
    }
  }

  # Set max request body size
  request_body {
    max_size 50MB
  }
}`;
}

/**
 * Setup Caddy for multi-main instances
 * @param caddyImage The Docker image for Caddy
 * @param projectName Project name for container naming
 * @param mainCount Number of main instances
 * @param network The shared Docker network
 * @returns A promise that resolves to the started Caddy container
 */
export async function setupCaddyLoadBalancer({
	caddyImage = 'caddy:2-alpine',
	projectName,
	mainCount,
	network,
}: {
	caddyImage?: string;
	projectName: string;
	mainCount: number;
	network: StartedNetwork;
}): Promise<StartedTestContainer> {
	// Generate upstream server addresses
	const upstreamServers = Array.from(
		{ length: mainCount },
		(_, index) => `${projectName}-n8n-main-${index + 1}:5678`,
	);

	// Build the Caddy configuration
	const caddyConfig = buildCaddyConfig(upstreamServers);

	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		return await new GenericContainer(caddyImage)
			.withNetwork(network)
			.withExposedPorts(80)
			.withCopyContentToContainer([{ content: caddyConfig, target: '/etc/caddy/Caddyfile' }])
			.withWaitStrategy(Wait.forListeningPorts())
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'caddy-lb',
			})
			.withName(`${projectName}-caddy-lb`)
			.withReuse()
			.withLogConsumer(consumer)
			.start();
	} catch (error) {
		return throwWithLogs(error);
	}
}

/**
 * Polls a container's HTTP endpoint until it returns a 200 status.
 * Logs a warning if the endpoint does not return 200 within the specified timeout.
 *
 * @param container The started container.
 * @param endpoint The HTTP health check endpoint (e.g., '/healthz/readiness').
 * @param timeoutMs Total timeout in milliseconds (default: 60,000ms).
 */
export async function pollContainerHttpEndpoint(
	container: StartedTestContainer,
	endpoint: string,
	timeoutMs: number = 60000,
): Promise<void> {
	const startTime = Date.now();
	const url = `http://${container.getHost()}:${container.getFirstMappedPort()}${endpoint}`;
	const retryIntervalMs = 1000;

	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.status === 200) {
				return;
			}
		} catch (error) {
			// Don't log errors, just retry
		}

		await wait(retryIntervalMs);
	}

	console.error(
		`WARNING: HTTP endpoint at ${url} did not return 200 within ${
			timeoutMs / 1000
		} seconds. Proceeding with caution.`,
	);
}

// TODO: Look at Ollama container?
// TODO: Look at MariaDB container?
// TODO: Look at MockServer container, could we use this for mocking out external services?
