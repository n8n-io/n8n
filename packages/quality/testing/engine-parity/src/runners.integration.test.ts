import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { handWrittenCases } from './fixtures/hand-written';
import { ruleSets } from './grammar/rules';
import { checkCase } from './parity';
import { V1Runner } from './runners/v1-runner';
import { V2Runner } from './runners/v2-runner';

describe('runners (integration)', () => {
	const runners = { v1: new V1Runner(), v2: new V2Runner() };

	beforeAll(async () => {
		await runners.v1.start();
		await runners.v2.start();
	});

	afterAll(async () => {
		await runners.v2.stop();
		await runners.v1.stop();
	});

	it.each(Object.entries(handWrittenCases))(
		'runs "%s" on both engines alike',
		async (_, parityCase) => {
			const result = await checkCase(parityCase, runners, ruleSets.full);

			expect(result.raw.v1?.kind).toBe('ran');
			expect(result.raw.v2?.kind).toBe('ran');
			expect(result.findings).toEqual([]);
			expect(result.failures).toEqual([]);
		},
	);

	it('reports the same error on both engines', async () => {
		const result = await checkCase(
			handWrittenCases['reference to a node that does not exist'],
			runners,
			ruleSets.full,
		);

		expect(result.outcomes.v1?.error).toEqual({ node: 'A', class: 'NodeOperationError' });
		expect(result.outcomes.v2?.error).toEqual({ node: 'A', class: 'NodeOperationError' });
	});
});
