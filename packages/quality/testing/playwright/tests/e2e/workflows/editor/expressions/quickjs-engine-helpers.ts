import type { Page } from '@playwright/test';

import { EDIT_FIELDS_SET_NODE_NAME } from '../../../../../config/constants';
import type { n8nPage } from '../../../../../pages/n8nPage';

export interface CspViolation {
	disposition: string;
	effectiveDirective: string;
	blockedURI: string;
}

/** Counters and events the probe keeps on the page under test. */
export interface WasmProbeState {
	wasmInstantiations: number;
	wasmSuccesses: number;
	wasmFailures: number;
	cspViolations: CspViolation[];
}

type ProbeWindow = Window & WasmProbeState;

export async function installWasmProbe(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const probe = window as unknown as ProbeWindow;
		probe.wasmInstantiations = 0;
		probe.wasmSuccesses = 0;
		probe.wasmFailures = 0;
		probe.cspViolations = [];

		document.addEventListener('securitypolicyviolation', (event) => {
			probe.cspViolations.push({
				disposition: event.disposition,
				effectiveDirective: event.effectiveDirective,
				blockedURI: event.blockedURI,
			});
		});

		for (const name of ['instantiate', 'instantiateStreaming'] as const) {
			const original = WebAssembly[name];
			// @ts-expect-error the probe replaces the host global on purpose
			WebAssembly[name] = async function (...args: unknown[]) {
				probe.wasmInstantiations++;
				try {
					// @ts-expect-error forwarding through the replaced global
					const result = await (original.apply(WebAssembly, args) as Promise<unknown>);
					probe.wasmSuccesses++;
					return result;
				} catch (error) {
					probe.wasmFailures++;
					throw error;
				}
			};
		}
	});
}

export async function readWasmProbe(page: Page): Promise<WasmProbeState> {
	return await page.evaluate(() => {
		const state = window as unknown as ProbeWindow;
		return {
			wasmInstantiations: state.wasmInstantiations,
			wasmSuccesses: state.wasmSuccesses,
			wasmFailures: state.wasmFailures,
			cspViolations: state.cspViolations,
		};
	});
}

export function recordPageErrors(page: Page): {
	getPageErrors: () => Error[];
	getEngineInitErrors: () => string[];
} {
	const pageErrors: Error[] = [];
	const engineInitErrors: string[] = [];

	page.on('pageerror', (error) => {
		pageErrors.push(error);
	});
	page.on('console', (message) => {
		if (message.type() === 'error' && message.text().includes('expression engine')) {
			engineInitErrors.push(message.text());
		}
	});

	return {
		getPageErrors: () => pageErrors,
		getEngineInitErrors: () => engineInitErrors,
	};
}

export async function addEditFields(n8n: n8nPage): Promise<void> {
	await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
	await n8n.ndv.getAssignmentCollectionAdd('assignments').click();
	await n8n.ndv.clickAssignmentExpressionToggle('assignments');
}
