import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

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
	mainInstances,
	network,
}: {
	nginxImage: string;
	projectName: string;
	mainInstances: StartedTestContainer[];
	network: StartedNetwork;
}): Promise<StartedTestContainer> {
	// Generate upstream server entries from the list of main instances.
	const upstreamServers = mainInstances
		.map((_, index) => `  server ${projectName}-n8n-main-${index + 1}:5678;`)
		.join('\n');

	// Build the NGINX configuration with dynamic upstream servers.
	// This allows us to have the port allocation be dynamic.
	const nginxConfig = buildNginxConfig(upstreamServers);

	return await new GenericContainer(nginxImage)
		.withNetwork(network)
		.withExposedPorts(80)
		.withCopyContentToContainer([{ content: nginxConfig, target: '/etc/nginx/nginx.conf' }])
		.withWaitStrategy(Wait.forListeningPorts())
		.withLabels({
			'com.docker.compose.project': projectName,
			'com.docker.compose.service': 'nginx-lb',
		})
		.withName(`${projectName}-nginx-lb`)
		.withReuse()
		.start();
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

// TODO: Look at Ollama container?
// TODO: Look at MariaDB container?
// TODO: Look at MockServer container, could we use this for mocking out external services?
