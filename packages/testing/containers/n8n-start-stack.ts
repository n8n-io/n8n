#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { DockerImageNotFoundError } from './docker-image-not-found-error';
import { BASE_PERFORMANCE_PLANS, isValidPerformancePlan } from './performance-plans';
import { createServiceStack } from './service-stack';
import type { CloudflaredResult } from './services/cloudflared';
import type { KentResult } from './services/kent';
import type { KeycloakResult } from './services/keycloak';
import type { MailpitResult } from './services/mailpit';
import type { NgrokResult } from './services/ngrok';
import { services as SERVICE_REGISTRY } from './services/registry';
import type { TracingResult } from './services/tracing';
import type { ServiceName } from './services/types';
import type { VictoriaLogsResult } from './services/victoria-logs';
import type { VictoriaMetricsResult } from './services/victoria-metrics';
import type { N8NConfig, N8NStack } from './stack';
import { createN8NStack } from './stack';
import { TEST_CONTAINER_IMAGES } from './test-containers';

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
  --services-only   Start services only (no n8n containers), write .env for local dev
  --services <list> Comma-separated services (e.g. postgres,redis,mailpit,proxy,kafka)
  --postgres        Use PostgreSQL instead of SQLite
  --queue           Enable queue mode (requires PostgreSQL)
  --source-control  Enable source control (Git) container for testing
  --oidc            Enable OIDC testing with Keycloak (requires PostgreSQL)
  --observability   Enable observability stack (VictoriaLogs + VictoriaMetrics + Vector)
  --tracing         Enable tracing stack (n8n-tracer + Jaeger) for workflow visualization
  --kafka           Enable Kafka broker for message queue trigger testing
  --tunnel          Enable Cloudflare Tunnel for public URL (via trycloudflare.com)
  --ngrok           Enable ngrok tunnel for public URL (requires NGROK_AUTHTOKEN env var)
  --mailpit         Enable Mailpit for email testing
  --kent            Enable Kent (Sentry mock) for error tracking testing
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
  • TEST_IMAGE_N8N=<image>  Use a custom Docker image (default: n8nio/n8n:local)

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

  ${colors.bright}# Services only (local dev — writes .env for pnpm start)${colors.reset}
  pnpm services --services postgres
  pnpm services --services postgres,redis
  pnpm services --services postgres,mailpit,proxy

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
			'services-only': { type: 'boolean' },
			postgres: { type: 'boolean' },
			queue: { type: 'boolean' },
			services: { type: 'string' },
			'source-control': { type: 'boolean' },
			oidc: { type: 'boolean' },
			observability: { type: 'boolean' },
			tracing: { type: 'boolean' },
			kafka: { type: 'boolean' },
			tunnel: { type: 'boolean' },
			ngrok: { type: 'boolean' },
			mailpit: { type: 'boolean' },
			kent: { type: 'boolean' },
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

	const servicesOnly = values['services-only'] ?? false;

	// Build services array from CLI flags
	const validServiceNames = new Set(Object.keys(SERVICE_REGISTRY));
	const services: ServiceName[] = [];
	if (values.services) {
		for (const name of values.services.split(',').map((s) => s.trim())) {
			if (!validServiceNames.has(name)) {
				log.error(`Unknown service: '${name}'. Available: ${[...validServiceNames].join(', ')}`);
				process.exit(1);
			}
			services.push(name as ServiceName);
		}
	}
	if (values['source-control']) services.push('gitea');
	if (values.oidc) services.push('keycloak');
	if (values.observability) services.push('victoriaLogs', 'victoriaMetrics', 'vector');
	if (values.tracing) services.push('tracing');
	if (values.kafka) services.push('kafka');
	if (values.tunnel) services.push('cloudflared');
	if (values.ngrok) services.push('ngrok');
	if (values.mailpit) services.push('mailpit');
	if (values.kent) services.push('kent');

	// Build configuration
	const config: N8NConfig = {
		postgres: values.postgres ?? false,
		services,
		projectName:
			values.name ??
			(servicesOnly
				? `n8n-svc-${Math.random().toString(36).substring(7)}`
				: `n8n-stack-${Math.random().toString(36).substring(7)}`),
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

	// Services-only mode: start containers, write .env, no n8n
	if (servicesOnly) {
		if (services.length === 0) {
			log.error('No services specified. Use flags like --postgres, --redis, --mailpit, etc.');
			process.exit(1);
		}

		log.header('Starting service containers');
		log.info(`Project: ${config.projectName}`);
		log.info(`Services: ${services.join(', ')}`);

		try {
			const stack = await createServiceStack({
				services,
				projectName: config.projectName,
			});

			// Collect host-compatible env vars from each service
			const envVars: Record<string, string> = {};
			for (const name of services) {
				const result = stack.serviceResults[name];
				if (!result) continue;

				const service = SERVICE_REGISTRY[name];
				Object.assign(
					envVars,
					service.env?.(result, true) ?? {},
					service.extraEnv?.(result, true) ?? {},
				);
			}

			// Write .env to packages/cli/bin/ because `pnpm start` runs os-normalize.mjs
			// which does `cd packages/cli/bin` before launching n8n, and dotenv loads from cwd.
			if (Object.keys(envVars).length > 0) {
				const repoRoot = resolve(__dirname, '../../..');
				const envPath = resolve(repoRoot, 'packages/cli/bin/.env');
				const lines = [
					'# Generated by pnpm services — do not edit',
					`# Project: ${stack.projectName}`,
					'# Stop with: pnpm --filter n8n-containers services:clean',
					'',
					...Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
					'',
				];
				writeFileSync(envPath, lines.join('\n'));
				log.success(`Wrote ${Object.keys(envVars).length} env vars to packages/cli/bin/.env`);
			}

			// Print summary
			log.header('Services running');
			for (const name of services) {
				const result = stack.serviceResults[name];
				if (!result) continue;

				const service = SERVICE_REGISTRY[name];
				const vars = {
					...(service.env?.(result, true) ?? {}),
					...(service.extraEnv?.(result, true) ?? {}),
				};
				const varSummary = Object.entries(vars)
					.map(([k, v]) => `${k}=${v}`)
					.join(', ');
				log.success(`${name}${varSummary ? `: ${varSummary}` : ''}`);
			}

			// Print mailpit UI URL if running
			const mailpitResult = stack.serviceResults.mailpit as MailpitResult | undefined;
			if (mailpitResult) {
				console.log('');
				log.info(`Mailpit UI: ${colors.cyan}${mailpitResult.meta.apiBaseUrl}${colors.reset}`);
			}

			console.log('');
			log.info('Containers are running in the background');
			log.info(`Run ${colors.bright}pnpm dev${colors.reset} in another terminal to start n8n`);
			log.info(
				`Cleanup: ${colors.bright}pnpm --filter n8n-containers services:clean${colors.reset}`,
			);
			console.log('');
		} catch (error) {
			log.error(
				`Failed to start services: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(1);
		}
		return;
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

		const ngrokResult = stack.serviceResults.ngrok as NgrokResult | undefined;
		if (ngrokResult) {
			console.log('');
			log.header('ngrok Tunnel');
			log.info(`Public URL: ${colors.cyan}${ngrokResult.meta.publicUrl}${colors.reset}`);
			log.info('Webhooks are accessible from the internet via this URL');
		}

		const mailpitResult = stack.serviceResults.mailpit as MailpitResult | undefined;
		if (mailpitResult) {
			console.log('');
			log.header('Email Testing (Mailpit)');
			log.info(`Mailpit UI: ${colors.cyan}${mailpitResult.meta.apiBaseUrl}${colors.reset}`);
		}

		const kentResult = stack.serviceResults.kent as KentResult | undefined;
		if (kentResult) {
			console.log('');
			log.header('Sentry Mock (Kent)');
			log.info(`Kent UI: ${colors.cyan}${kentResult.meta.apiUrl}${colors.reset}`);
			log.info(`Backend DSN: ${colors.cyan}${kentResult.meta.sentryDsn}${colors.reset}`);
			log.info(`Frontend DSN: ${colors.cyan}${kentResult.meta.frontendDsn}${colors.reset}`);
		}

		console.log('');
		log.info('Containers are running in the background');
		log.info(
			'Cleanup with: pnpm --filter n8n-containers stack:clean:all (stops containers and removes networks)',
		);
		console.log('');
	} catch (error) {
		log.error(`Failed to start: ${error as string}`);
		process.exit(1);
	}
}

function displayConfig(config: N8NConfig) {
	const dockerImage = TEST_CONTAINER_IMAGES.n8n;
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
	if (services.includes('kent')) enabledFeatures.push('Sentry Mock (Kent)');

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
	} else if (services.includes('ngrok')) {
		log.info('Tunnel: enabled (ngrok)');
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
}
