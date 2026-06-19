import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

/**
 * Reproduction for DEVP-475: extract ResourceLocator component from NDV.
 *
 * The resource-locator (RLC) surface is ~13 cohesive methods currently living
 * on the 929-line NodeDetailsViewPage god-object. The acceptance is a new
 * `pages/components/ResourceLocator.ts` component that NDV delegates to.
 *
 * Today the file does not exist. This test fails — that IS the reproduction.
 * It flips green once the component is extracted.
 */
const COMPONENT_PATH = resolve(__dirname, 'pages/components/ResourceLocator.ts');

describe('DEVP-475 ResourceLocator component extraction', () => {
	test('pages/components/ResourceLocator.ts exists', () => {
		expect(existsSync(COMPONENT_PATH)).toBe(true);
	});

	test('exports a ResourceLocator class', async () => {
		const module = (await import('./pages/components/ResourceLocator')) as Record<string, unknown>;
		expect(typeof module.ResourceLocator).toBe('function');
	});
});
