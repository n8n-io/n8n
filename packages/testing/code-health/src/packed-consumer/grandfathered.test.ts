import { describe, expect, it } from 'vitest';

import { GRANDFATHERED_SPECIFIERS, findGrandfathered } from './grandfathered.js';

describe('GRANDFATHERED_SPECIFIERS', () => {
	it('names an exact specifier, never a prefix or a glob', () => {
		// A directory-shaped exception is what let `.storybook/` hide two violations. An exact
		// string cannot widen to cover a subpath nobody reviewed.
		for (const entry of GRANDFATHERED_SPECIFIERS) {
			expect(entry.specifier).not.toContain('*');
			expect(entry.specifier.endsWith('/')).toBe(false);
		}
	});

	it('states a reason substantial enough to act on', () => {
		// The point of the list is that every exception is readable in the job output. A one-word
		// reason would make it a silent exclusion with extra steps.
		for (const entry of GRANDFATHERED_SPECIFIERS) {
			expect(entry.reason.length).toBeGreaterThan(80);
		}
	});

	it('holds no duplicates', () => {
		const specifiers = GRANDFATHERED_SPECIFIERS.map((e) => e.specifier);
		expect(new Set(specifiers).size).toBe(specifiers.length);
	});
});

describe('findGrandfathered', () => {
	it('matches only the exact specifier', () => {
		expect(findGrandfathered('@n8n/design-system/plugin')?.specifier).toBe(
			'@n8n/design-system/plugin',
		);
		expect(findGrandfathered('@n8n/design-system/plugin/extra')).toBeUndefined();
		expect(findGrandfathered('@n8n/design-system')).toBeUndefined();
	});
});
