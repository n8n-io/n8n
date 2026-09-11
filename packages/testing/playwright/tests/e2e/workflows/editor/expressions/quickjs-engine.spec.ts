import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const SCHEDULE_PARAMETER_NAME = 'daysInterval';

/** The counter the probe keeps on the page under test. */
type ProbeWindow = Window & { wasmInstantiations: number };

/**
 * Runs only on an instance started with `N8N_EXPRESSION_ENGINE_FRONTEND=quickjs`.
 *
 * The other expression specs cannot tell the engines apart, because the legacy
 * evaluator resolves the same expressions. A WebAssembly instantiation can: only
 * the QuickJS path builds a wasm module in the page. This also covers the bundle
 * hand-off — the browser has no filesystem, so a bridge that fell back to its
 * own file read would throw instead of instantiating anything.
 */
test.describe(
	'QuickJS expression engine',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('resolves an expression through the wasm runtime', async ({ n8n }) => {
			const engine = await n8n.api.getFrontendExpressionEngine();
			test.skip(engine !== 'quickjs', 'instance does not run the quickjs frontend engine');

			// `n8n.page` is the page the fixture drives. The bare `page` fixture is a
			// second, blank one in the same context, and sees none of this traffic.
			const page = n8n.page;

			await page.addInitScript(() => {
				const probe = window as ProbeWindow;
				probe.wasmInstantiations = 0;
				for (const name of ['instantiate', 'instantiateStreaming'] as const) {
					const original = WebAssembly[name];
					// @ts-expect-error the probe replaces the host global on purpose
					WebAssembly[name] = function (...args: unknown[]) {
						probe.wasmInstantiations++;
						// @ts-expect-error forwarding through the replaced global
						return original.apply(WebAssembly, args);
					};
				}
			});

			// The fixture already loaded the app, so the init script needs a fresh load.
			await page.reload();

			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

			const instantiations = await page.evaluate(() => (window as ProbeWindow).wasmInstantiations);
			expect(instantiations, 'the page instantiated the QuickJS wasm module').toBeGreaterThan(0);
		});
	},
);
