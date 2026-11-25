import type { Page, Route } from '@playwright/test';

import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import {
	addEditFields,
	installWasmProbe,
	readWasmProbe,
	recordPageErrors,
} from './quickjs-engine-helpers';

/**
 * Runs the editor on the QuickJS engine. Without this the container keeps the
 * `legacy` default, and every assertion here would pass on the wrong engine —
 * the two evaluators resolve the same expressions.
 */
test.use({ capability: { env: { N8N_EXPRESSION_ENGINE_FRONTEND: 'quickjs' } } });

const SCHEDULE_PARAMETER_NAME = 'daysInterval';
const QUICKJS_WASM_URL = '**/emscripten-module*.wasm*';

interface Deferred {
	promise: Promise<void>;
	resolve: () => void;
}

function createDeferred(): Deferred {
	let resolve = () => {};
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

/**
 * Holds QuickJS WASM asset requests until `release()` is called, so a test can
 * observe startup while the engine is still loading.
 */
async function holdQuickJsWasm(page: Page): Promise<{
	requested: Promise<void>;
	release: () => void;
	getRequestCount: () => number;
}> {
	const requested = createDeferred();
	const gate = createDeferred();
	let requestCount = 0;

	await page.route(QUICKJS_WASM_URL, async (route: Route) => {
		requestCount++;
		requested.resolve();
		await gate.promise;
		await route.continue();
	});

	return {
		requested: requested.promise,
		release: gate.resolve,
		getRequestCount: () => requestCount,
	};
}

test.describe(
	'QuickJS expression engine',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			// A local run points at an instance this harness does not configure, so
			// the engine is whatever the developer started.
			const engine = await n8n.api.getFrontendExpressionEngine();
			test.skip(engine !== 'quickjs', 'instance does not run the quickjs frontend engine');
		});

		test('evaluates through the wasm runtime, not the legacy evaluator', async ({ n8n }) => {
			// `n8n.page` is the page the fixture drives. The bare `page` fixture is a
			// second, blank one in the same context, and sees none of this traffic.
			const page = n8n.page;

			await installWasmProbe(page);
			// The fixture already loaded the app, so the init script needs a fresh load.
			await page.reload();

			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

			const { wasmInstantiations } = await readWasmProbe(page);
			expect(wasmInstantiations, 'the page instantiated the QuickJS wasm module').toBeGreaterThan(
				0,
			);
		});

		test('resolves $json with n8n extensions, and the backend agrees', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ myStr: 'Monday Morning' }]);
			await n8n.ndv.close();

			await addEditFields(n8n);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{$json.myStr.toSnakeCase()}}');

			// The preview runs in the browser on QuickJS.
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toContainText('monday_morning');

			// The execution runs on the backend engine. Both must agree, or the two
			// evaluators have drifted.
			await n8n.ndv.execute();
			await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
			await expect(n8n.ndv.getOutputDataContainer()).toContainText('monday_morning');
		});

		test('resolves luxon and Intl through the host bridge', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);

			// QuickJS ships without ECMA-402, so Intl is delegated to the host.
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor("{{ new Intl.NumberFormat('de-DE').format(1234.5)");
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('1.234,5');

			// Luxon reaches the same bridge for its locale and zone data.
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor(
				"{{ DateTime.fromISO('2024-03-05').toFormat('yyyy LLLL dd')",
			);
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('2024 March 05');
		});

		test('keeps resolving after the node view is reopened', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('3');
			await n8n.ndv.close();

			// The editor builds a new Expression for the reopened view. It has to
			// evaluate without acquiring a bridge of its own.
			await n8n.canvas.openNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor("{{ 'abc'.toUpperCase()");
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('ABC');
		});

		test('waits for a delayed engine start and evaluates through QuickJS once ready', async ({
			n8n,
		}) => {
			const page = n8n.page;
			const errors = recordPageErrors(page);

			await installWasmProbe(page);
			const wasmHold = await holdQuickJsWasm(page);

			const loginResponse = page.waitForResponse(
				(response) => new URL(response.url()).pathname.endsWith('/rest/login') && response.ok(),
			);
			const settingsResponse = page.waitForResponse(
				(response) => new URL(response.url()).pathname.endsWith('/rest/settings') && response.ok(),
			);

			const navigation = n8n.start.fromBlankCanvas();
			// Prevent an unhandled rejection if an assertion below fails before `await navigation`.
			navigation.catch(() => {});
			try {
				// Both boot auth/settings and the QuickJS WASM request run in parallel.
				await Promise.all([wasmHold.requested, loginResponse, settingsResponse]);

				// The workflow canvas must not render while QuickJS is still starting.
				await expect(n8n.canvas.canvasPane()).toBeHidden();
				const probeWhileHeld = await readWasmProbe(page);
				expect(probeWhileHeld.wasmSuccesses, 'QuickJS wasm has not instantiated yet').toBe(0);
				expect(
					wasmHold.getRequestCount(),
					'the login hook reused the in-flight boot start instead of fetching WASM twice',
				).toBe(1);
			} finally {
				wasmHold.release();
			}

			await navigation;

			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

			const probe = await readWasmProbe(page);
			expect(wasmHold.getRequestCount(), 'the page fetched the QuickJS wasm once').toBe(1);
			expect(probe.wasmSuccesses, 'the page instantiated the QuickJS wasm once').toBe(1);
			expect(probe.wasmFailures).toBe(0);
			expect(
				errors.getPageErrors(),
				'no uncaught page errors occurred during delayed startup',
			).toEqual([]);
		});
	},
);
