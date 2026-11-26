import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import {
	addEditFields,
	installWasmProbe,
	readWasmProbe,
	recordPageErrors,
} from './quickjs-engine-helpers';

/**
 * Runs the editor on QuickJS under a strict nonce-based CSP that omits both
 * `'wasm-unsafe-eval'` and `'unsafe-eval'`. Both keywords must be absent: in
 * CSP Level 3, `'unsafe-eval'` also permits WebAssembly compilation, so the
 * default policy does not block QuickJS.
 */
test.use({
	capability: {
		env: {
			N8N_EXPRESSION_ENGINE_FRONTEND: 'quickjs',
			N8N_CONTENT_SECURITY_POLICY:
				"script-src <nonce> 'strict-dynamic'; object-src 'none'; base-uri 'none'",
		},
	},
});

function hasWasmDisallowedCsp(policy: string | undefined): boolean {
	return (
		typeof policy === 'string' &&
		policy.includes("'strict-dynamic'") &&
		!policy.includes('wasm-unsafe-eval') &&
		!policy.includes('unsafe-eval')
	);
}

test.describe(
	'QuickJS expression engine under a strict CSP',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test.skip(
			Boolean(process.env.N8N_BASE_URL && process.env.N8N_EDITOR_URL),
			'backend-served page only: the Vite dev server does not enforce the backend CSP',
		);

		test.beforeEach(async ({ n8n }) => {
			// Local runs connect to an attached server whose env this harness does not set.
			// Container runs in CI always apply `test.use()` above and never skip here.
			const isAttachedInstance = Boolean(process.env.N8N_BASE_URL);
			const engine = await n8n.api.getFrontendExpressionEngine();
			test.skip(
				isAttachedInstance && engine !== 'quickjs',
				'instance does not run the quickjs frontend engine',
			);

			const enforcedCsp = await n8n.api.securitySettings.getEnforcedContentSecurityPolicy();
			test.skip(
				isAttachedInstance && !hasWasmDisallowedCsp(enforcedCsp),
				'instance does not enforce a strict CSP without wasm-unsafe-eval',
			);
		});

		test('keeps the editor usable under a strict CSP without wasm-unsafe-eval', async ({ n8n }) => {
			const page = n8n.page;
			const errors = recordPageErrors(page);

			// Confirm the server actually enforces the strict CSP, so the test cannot pass without it.
			expect(await n8n.api.getFrontendExpressionEngine()).toBe('quickjs');
			const enforcedCsp = await n8n.api.securitySettings.getEnforcedContentSecurityPolicy();
			expect(enforcedCsp).toContain("'strict-dynamic'");
			expect(enforcedCsp).not.toContain('wasm-unsafe-eval');
			expect(enforcedCsp).not.toContain('unsafe-eval');

			await installWasmProbe(page);
			await n8n.start.fromBlankCanvas();

			// Confirm the browser blocked QuickJS WASM compilation under the enforced policy.
			const probe = await readWasmProbe(page);
			expect(probe.wasmFailures, 'QuickJS wasm instantiation failed under CSP').toBeGreaterThan(0);
			expect(probe.wasmSuccesses, 'QuickJS wasm must not instantiate under CSP').toBe(0);
			expect(probe.cspViolations).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						disposition: 'enforce',
						blockedURI: 'wasm-eval',
					}),
				]),
			);
			expect(
				errors.getEngineInitErrors().length,
				'the editor caught and logged the engine start failure',
			).toBeGreaterThan(0);
			await expect(n8n.notifications.getNotificationByTitle('Error connecting to n8n')).toHaveCount(
				0,
			);

			// The editor must remain usable for building and executing workflows.
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ myStr: 'Monday Morning' }]);
			await n8n.ndv.close();

			await addEditFields(n8n);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $json.myStr.toSnakeCase()');
			// Neither QuickJS nor legacy eval can run without `wasm-unsafe-eval` or `unsafe-eval`,
			// so the preview degrades cleanly to `null` instead of crashing the editor.
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('null');

			await n8n.ndv.execute();
			await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
			await expect(n8n.ndv.getOutputDataContainer()).toContainText('monday_morning');
			expect(
				errors.getPageErrors(),
				'no uncaught page errors occurred under the strict CSP',
			).toEqual([]);
		});
	},
);
