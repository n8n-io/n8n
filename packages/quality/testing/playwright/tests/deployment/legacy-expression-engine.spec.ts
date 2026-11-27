import { expect, test } from '@playwright/test';

import { assertN8nImage, runDeploymentCell } from './probe';

const LEGACY_EXPRESSION_WARNING = /N8N_EXPRESSION_ENGINE -> .*`legacy` expression engine/;

test(
	'Legacy expression engine',
	{
		tag: '@cell:ENV-27',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				env: {
					N8N_EXPRESSION_ENGINE: 'legacy',
				},
			},
			probe: async ({ probe }) => await probe.runWebhook(),
			check: async ({ stack }) => {
				assertN8nImage(stack);

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();

				const mainName = main.getName().replace(/^\//, '');
				const startupLogs = stack.startupDiagnostics.logs[mainName] ?? '';
				expect(
					startupLogs,
					`Expected startup logs for ${mainName} to warn about the legacy expression engine`,
				).toMatch(LEGACY_EXPRESSION_WARNING);
			},
		});
	},
);
