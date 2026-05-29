#!/usr/bin/env tsx
/**
 * Standalone script to start the n8n sandbox service (API + runner) using the
 * testcontainers-based sandbox service definition. Creates a named Docker
 * network so that separately-started n8n containers can join it.
 *
 * Usage: pnpm tsx packages/testing/containers/start-sandbox.ts [--network <name>]
 */
import { parseArgs } from 'node:util';
import { Network } from 'testcontainers';
import type { Uuid } from 'testcontainers';

import { sandbox } from './services/sandbox';

const { values } = parseArgs({
	options: { network: { type: 'string', default: 'n8n-eval-net' } },
	strict: false,
});

const networkName = values.network ?? 'n8n-eval-net';
const projectName = 'n8n-sandbox-ci';

class FixedName implements Uuid {
	constructor(private readonly name: string) {}
	nextUuid() {
		return this.name;
	}
}

async function main() {
	console.log(`Creating network "${networkName}"...`);
	const network = await new Network(new FixedName(networkName)).start();

	console.log('Starting sandbox service...');
	const result = await sandbox.start(network, projectName);

	console.log(`Sandbox API URL: ${result.meta.apiUrl}`);
	console.log(`Network: ${network.getName()}`);
	console.log('Sandbox service is ready');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
