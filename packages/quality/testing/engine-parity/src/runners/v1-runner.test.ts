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

	it('runs a node on each item that Split Out makes', async () => {
		const outcome = await run('split out into a set');

		expect(outcome?.status).toBe('success');
		expect(outcome?.terminal).toEqual([{ marked: '1!' }, { marked: '2!' }, { marked: '3!' }]);
	});

	it('routes items through both If branches into the Merge', async () => {
		const outcome = await run('if into merge');

		expect(outcome?.status).toBe('success');
		expect(outcome?.terminal).toEqual([{ size: 'big' }, { size: 'big' }, { size: 'small' }]);
	});

	it('reports the failing node and the error class', async () => {
		const outcome = await run('reference to a node that does not exist');

		expect(outcome?.status).toBe('error');
		expect(outcome?.error).toEqual({ node: 'A', class: 'NodeOperationError' });
	});

	it('runs a loop once for each batch', async () => {
		const outcome = await run('loop over items');

		expect(outcome?.nodes.Body).toHaveLength(3);
		expect(outcome?.terminal).toEqual([{ ran: 'yes' }, { ran: 'yes' }, { ran: 'yes' }]);
	});

	it('runs Code nodes in process', async () => {
		const outcome = await run('code node, each item');

		expect(outcome?.terminal).toEqual([
			{ n: 1, doubled: 2, first: 1 },
			{ n: 2, doubled: 4, first: 1 },
		]);
	});
});
