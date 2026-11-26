import { expect, test } from '@playwright/test';

import { assertN8nImage, runDeploymentCell } from './probe';
import {
	checkSubpathHealth,
	readSubpathEditorAssets,
	readSubpathWebhookSettings,
} from './subpath-prefix-helpers';

const PATH_PREFIX = '/n8n/';

test(
	'Reverse-proxy subpath prefix',
	{
		tag: '@cell:ENV-21',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				pathPrefix: PATH_PREFIX,
			},
			probe: async ({ probe }) => await probe.runWebhook(),
			check: async ({ stack, probe, probeOutput }) => {
				assertN8nImage(stack);

				const health = await checkSubpathHealth(probe);
				expect(health.prefixedStatus, 'Expected prefixed /n8n/healthz to return 200').toBe(200);
				expect(
					health.unprefixedStatus,
					`Expected unprefixed ${health.unprefixedUrl} to return 404`,
				).toBe(404);

				const settings = await readSubpathWebhookSettings(probe);
				expect(
					settings.ok,
					`Expected GET rest/settings to succeed (${settings.status}): ${settings.body.slice(0, 400)}`,
				).toBe(true);
				expect(
					settings.urlBaseWebhook,
					`Expected urlBaseWebhook "${settings.urlBaseWebhook}" to include "${PATH_PREFIX}"`,
				).toContain(PATH_PREFIX);
				expect(settings.endpointWebhook, 'Expected endpointWebhook in rest/settings').not.toBe('');

				const productionWebhookUrl = new URL(
					`${settings.endpointWebhook}/${probeOutput.webhookPath}`,
					settings.urlBaseWebhook,
				).href;
				expect(
					new URL(productionWebhookUrl).pathname,
					`Expected production webhook URL "${productionWebhookUrl}" to use "${PATH_PREFIX}"`,
				).toBe(`${PATH_PREFIX}${settings.endpointWebhook}/${probeOutput.webhookPath}`);

				const editor = await readSubpathEditorAssets(probe);
				expect(editor.htmlStatus, 'Expected editor HTML request under /n8n/ to succeed').toBe(200);
				expect(
					editor.html,
					'Expected editor HTML not to contain raw BASE_PATH placeholder',
				).not.toContain('{{BASE_PATH}}');
				expect(
					editor.assetPaths.length,
					'Expected editor HTML to reference compiled asset or static files',
				).toBeGreaterThan(0);

				const unprefixedAssets = editor.assetPaths.filter(
					(assetPath) => !assetPath.startsWith(PATH_PREFIX),
				);
				expect(
					unprefixedAssets,
					`Expected all editor HTML asset paths to start with "${PATH_PREFIX}"`,
				).toEqual([]);
				expect(
					editor.staticAsset,
					'Expected editor HTML to reference at least one /static/ file',
				).not.toBeNull();
				expect(
					editor.staticAsset?.status,
					`Expected prefixed static asset ${editor.staticAsset?.url ?? '(none)'} to return 200`,
				).toBe(200);
				expect(
					editor.compiledAsset,
					'Expected editor HTML to reference at least one compiled /assets/ file',
				).not.toBeNull();
				expect(
					editor.compiledAsset?.status,
					`Expected prefixed compiled asset ${editor.compiledAsset?.url ?? '(none)'} to return 200`,
				).toBe(200);

				expect(
					stack.serviceResults.loadBalancer,
					'Expected Caddy load balancer container in the stack',
				).toBeDefined();
				expect(
					new URL(stack.baseUrl).pathname,
					`Expected stack baseUrl "${stack.baseUrl}" to use path prefix "${PATH_PREFIX}"`,
				).toBe(PATH_PREFIX);
			},
		});
	},
);
