import { describe, expect, it } from 'vitest';

import { findingFailsRun } from './signature';
import type { Finding } from './signature';

describe('findingFailsRun', () => {
	it.each<[Finding['kind'], boolean]>([
		['refused', true],
		['timeout', true],
		['droppedEdge', false],
	])('a "%s" finding fails the run: %s', (kind, expected) => {
		expect(findingFailsRun({ kind, engine: 'v2', message: '' })).toBe(expected);
	});
});
