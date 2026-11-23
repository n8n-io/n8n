import { describe, expect, it } from 'vitest';

import { handWrittenCases } from '../fixtures/hand-written';
import { normalize } from '../oracle/normalize';
import { V1Runner } from './v1-runner';

describe('V1Runner', () => {
	const runner = new V1Runner();

	async function run(name: string) {
		const parityCase = handWrittenCases[name];
		return normalize(await runner.run(parityCase), parityCase);
	}

	it('feeds the trigger items forward and resolves references', async () => {
		const outcome = await run('linear pipeline with references');

		expect(outcome?.status).toBe('success');
		expect(outcome?.terminal).toEqual([{ c: 's-a-b-c', fromA: 's-a' }]);
	});

	it('reports the failing node and the error class', async () => {
		const outcome = await run('reference to a node that does not exist');

		expect(outcome?.status).toBe('error');
		expect(outcome?.error).toEqual({ node: 'A', class: 'NodeOperationError' });
	});
});
