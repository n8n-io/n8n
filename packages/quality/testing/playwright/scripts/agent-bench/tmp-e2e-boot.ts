// Throwaway: boots a live ingress stack for manual UI end-to-end testing. Not for commit.
import { createN8NStack } from 'n8n-containers';
import { writeFileSync } from 'node:fs';

import { stackConfig } from './config';
import { N8nClient, OWNER } from './n8n-client';
import { seedAgent } from './workload';

async function main() {
	const config = {
		model: 'anthropic/claude-haiku-4-5',
		image: process.env.IMAGE ?? 'n8nio/n8n:qm-v7',
		workerConcurrency: 10,
		env: {
			N8N_LOG_LEVEL: 'debug',
			N8N_METRICS: 'true',
			N8N_ENABLED_MODULES: 'agents,apps',
			N8N_APPS_BASE_URL: 'http://apps.localhost:5691',
			N8N_EDITOR_BASE_URL: 'http://localhost:5691',
			N8N_SECURE_COOKIE: 'false',
			...(process.env.PUBLIC_URL ? { WEBHOOK_URL: process.env.PUBLIC_URL } : {}),
		},
	} as never;
	const n8nConfig = stackConfig(
		{ name: 'e2e-ui', mains: 1, webhooks: 1, workers: 2, agentQueue: true } as never,
		config,
	);
	n8nConfig.projectName = 'e2e-ui';
	const stack = await createN8NStack(n8nConfig);
	const client = new N8nClient(stack.baseUrl);
	await client.setupOwner();
	const seeded = await seedAgent(client, 'anthropic/claude-haiku-4-5', true, {});

	const state = {
		baseUrl: stack.baseUrl,
		processUrls: stack.processUrls,
		owner: OWNER,
		projectId: seeded.projectId,
		agentId: seeded.agentId,
	};
	writeFileSync('/tmp/e2e-ui-state.json', JSON.stringify(state, null, 2));
	console.log('READY', JSON.stringify(state));
	setInterval(() => {}, 60_000);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
