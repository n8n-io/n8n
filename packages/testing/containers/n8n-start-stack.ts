#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { DockerImageNotFoundError } from './docker-image-not-found-error';
import type { N8NConfig, N8NStack } from './n8n-test-container-creation';
import { createN8NStack } from './n8n-test-container-creation';

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
  --mains <n>       Number of main instances (default: 1)
  --workers <n>     Number of worker instances (default: 1)
  --name <name>     Project name for parallel runs
  --env KEY=VALUE   Set environment variables
  --help, -h        Show this help

${colors.yellow}Environment Variables:${colors.reset}
  • N8N_DOCKER_IMAGE=<image>  Use a custom Docker image (default: n8nio/n8n:local)

${colors.yellow}Examples:${colors.reset}
  ${colors.bright}# Simple SQLite instance${colors.reset}
  npm run stack

  ${colors.bright}# PostgreSQL database${colors.reset}
  npm run stack --postgres

  ${colors.bright}# Queue mode (automatically uses PostgreSQL)${colors.reset}
  npm run stack --queue

  ${colors.bright}# Custom scaling${colors.reset}
  npm run stack --queue --mains 3 --workers 5

  ${colors.bright}# With environment variables${colors.reset}
  npm run stack --postgres --env N8N_LOG_LEVEL=info --env N8N_ENABLED_MODULES=insights

  ${colors.bright}# Parallel instances${colors.reset}
  npm run stack --name test-1
  npm run stack --name test-2

${colors.yellow}Notes:${colors.reset}
  • SQLite is the default database (no external dependencies)
  • Queue mode requires PostgreSQL and enables horizontal scaling
  • Use --name for running multiple instances in parallel
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
			mains: { type: 'string' },
			workers: { type: 'string' },
			name: { type: 'string' },
			env: { type: 'string', multiple: true },
		},
		allowPositionals: false,
	});

	// Show help if requested
	if (values.help) {
		showHelp();
		process.exit(0);
	}

	// Build configuration
	const config: N8NConfig = {
		postgres: values.postgres ?? false,
		projectName: values.name ?? `n8n-stack-${Math.random().toString(36).substring(7)}`,
	};

	// Handle queue mode
	if (values.queue ?? values.mains ?? values.workers) {
		const mains = parseInt(values.mains ?? '1', 10);
		const workers = parseInt(values.workers ?? '1', 10);

		if (isNaN(mains) || isNaN(workers) || mains < 1 || workers < 0) {
			log.error('Invalid mains or workers count');
			process.exit(1);
		}

		config.queueMode = { mains, workers };

		if (!values.queue && (values.mains ?? values.workers)) {
			log.warn('--mains and --workers imply queue mode');
		}
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
		log.info('Starting containers...');
		try {
			stack = await createN8NStack(config);
		} catch (error) {
			if (error instanceof DockerImageNotFoundError) {
				log.error(error.message);
				process.exit(1);
			}
			throw error;
		}

		log.success('All containers started successfully!');
		console.log('');
		log.info(`n8n URL: ${colors.bright}${colors.green}${stack.baseUrl}${colors.reset}`);
	} catch (error) {
		log.error(`Failed to start: ${error as string}`);
		process.exit(1);
	}
}

function displayConfig(config: N8NConfig) {
	const dockerImage = process.env.N8N_DOCKER_IMAGE ?? 'n8nio/n8n:local';
	log.info(`Docker image: ${dockerImage}`);

	// Determine actual database
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	const usePostgres = config.postgres || config.queueMode;
	log.info(`Database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);

	if (config.queueMode) {
		const qm = typeof config.queueMode === 'boolean' ? { mains: 1, workers: 1 } : config.queueMode;
		log.info(`Queue mode: ${qm.mains} main(s), ${qm.workers} worker(s)`);
		if (!config.postgres) {
			log.info('(PostgreSQL automatically enabled for queue mode)');
		}
		if (qm.mains && qm.mains > 1) {
			log.info('(load balancer will be configured)');
		}
	} else {
		log.info('Queue mode: disabled');
	}

	if (config.env) {
		const envCount = Object.keys(config.env).length;
		if (envCount > 0) {
			log.info(`Environment variables: ${envCount} custom variable(s)`);
			Object.entries(config.env).forEach(([key, value]) => {
				console.log(`  ${key}=${value}`);
			});
		}
	}

	if (process.env.TESTCONTAINERS_REUSE_ENABLE === 'true') {
		log.info('Container reuse: enabled (containers will persist)');
	}
}

// Run if executed directly
if (require.main === module) {
	main().catch((error) => {
		log.error(`Unexpected error: ${error}`);
		process.exit(1);
	});
}
