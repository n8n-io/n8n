#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { createHelmStack, type HelmStackMode } from './helm-stack';

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
	header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

function showHelp() {
	console.log(`
${colors.bright}n8n Helm Stack${colors.reset}

Start n8n via Helm chart in a K3s (lightweight Kubernetes) container.

${colors.yellow}Usage:${colors.reset}
  pnpm stack:helm [options]

${colors.yellow}Options:${colors.reset}
  --mode <mode>         standalone (SQLite, default) or queue (PostgreSQL + Redis + workers)
  --image <image>       n8n Docker image (default: n8nio/n8n:local)
  --chart-ref <ref>     Git branch/tag for n8n-hosting repo (default: main)
  --chart-repo <url>    Git repo URL (default: https://github.com/n8n-io/n8n-hosting.git)
  --k3s-image <image>   K3s image (default: rancher/k3s:v1.32.2-k3s1)
  --url-file <path>     Write URL to file when ready (for CI)
  --help, -h            Show this help

${colors.yellow}Examples:${colors.reset}
  ${colors.bright}# Start with default local image${colors.reset}
  pnpm stack:helm

  ${colors.bright}# Test specific n8n version against specific chart${colors.reset}
  pnpm stack:helm --image n8nio/n8n:1.80.0 --chart-ref v1.2.0

  ${colors.bright}# Queue mode (PostgreSQL + Redis + workers)${colors.reset}
  pnpm stack:helm --mode queue --image n8nio/n8n:latest

  ${colors.bright}# CI mode (writes URL to file)${colors.reset}
  pnpm stack:helm --url-file /tmp/n8n-url.txt &

${colors.yellow}Prerequisites:${colors.reset}
  • Docker with privileged container support
  • helm and kubectl CLIs installed locally
  • n8n Docker image built locally (pnpm build:docker) or available on Docker Hub
  • See HELM-TESTING.md for full requirements

${colors.yellow}Notes:${colors.reset}
  • helm and kubectl run on your host (not inside K3s)
  • Startup takes ~60-120s (K3s boot + image load + Helm install)
  • After startup, use kubectl with KUBECONFIG printed below
  • Press Ctrl+C to stop
`);
}

async function main() {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			help: { type: 'boolean', short: 'h' },
			mode: { type: 'string' },
			image: { type: 'string' },
			'chart-ref': { type: 'string' },
			'chart-repo': { type: 'string' },
			'k3s-image': { type: 'string' },
			'url-file': { type: 'string' },
			'kubeconfig-file': { type: 'string' },
		},
		allowPositionals: false,
	});

	if (values.help) {
		showHelp();
		process.exit(0);
	}

	log.header('Starting n8n Helm Stack');

	const mode = (values.mode as HelmStackMode) || undefined;

	const stack = await createHelmStack({
		n8nImage: values.image,
		helmChartRef: values['chart-ref'],
		helmChartRepo: values['chart-repo'],
		k3sImage: values['k3s-image'],
		mode,
	});

	log.header('Stack Ready');
	log.success(`n8n URL: ${colors.bright}${colors.green}${stack.baseUrl}${colors.reset}`);
	log.info(`Kubeconfig: ${colors.bright}export KUBECONFIG=${stack.kubeConfigPath}${colors.reset}`);

	if (values['url-file']) {
		writeFileSync(values['url-file'], stack.baseUrl);
		log.info(`URL written to ${values['url-file']}`);
	}

	if (values['kubeconfig-file']) {
		writeFileSync(values['kubeconfig-file'], stack.kubeConfigPath);
		log.info(`Kubeconfig path written to ${values['kubeconfig-file']}`);
	}

	console.log('');
	log.info('Debug with kubectl:');
	log.info(`  ${colors.bright}export KUBECONFIG=${stack.kubeConfigPath}${colors.reset}`);
	log.info(`  ${colors.bright}kubectl get pods${colors.reset}`);
	log.info(`  ${colors.bright}kubectl logs -l app.kubernetes.io/name=n8n${colors.reset}`);
	console.log('');
	log.info('Run tests against this instance:');
	log.info(
		`  ${colors.bright}N8N_BASE_URL=${stack.baseUrl} RESET_E2E_DB=true npx playwright test tests/e2e/building-blocks/ --workers=1${colors.reset}`,
	);
	console.log('');
	log.info('Press Ctrl+C to stop');

	// Keep process alive until SIGINT
	const keepAlive = setInterval(() => {}, 60_000);

	const shutdown = async () => {
		clearInterval(keepAlive);
		console.log('');
		log.info('Shutting down...');
		await stack.stop();
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

main().catch((error) => {
	log.error(`Failed to start: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
