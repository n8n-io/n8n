import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock, mockDeep } from 'jest-mock-extended';

import { execute } from '../actions/read.operation';
import * as readWriteUtils from '../helpers/utils';

describe('Read/Write Files from Disk, read operation', () => {
	let directory: string;

	beforeAll(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'n8n-read-'));
		await writeFile(path.join(directory, 'note.txt'), 'note');
	});

	afterAll(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it('reads the files matched by the selector', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>());
		context.getNodeParameter.mockImplementation((name) =>
			name === 'fileSelector' ? `${directory}/*.txt` : {},
		);
		context.helpers.prepareBinaryData.mockResolvedValue(mock<IBinaryData>());

		await execute.call(context, [{ json: {} }]);

		expect(
			context.helpers.prepareBinaryData.mock.calls.map(([, p]) => path.basename(p as string)),
		).toEqual(['note.txt']);
	});

	describe('shared glob budget', () => {
		afterEach(() => jest.restoreAllMocks());

		// A timed-out item must still spend the shared budget; otherwise, with
		// Continue On Fail, the next item would start over with a full budget.
		it('charges the budget for a timed-out item instead of refunding the next one', async () => {
			const budgets: Array<number | undefined> = [];
			jest
				.spyOn(readWriteUtils, 'globWithDeadline')
				.mockImplementation(async (node, _pattern, _options, itemIndex, budgetMs) => {
					budgets.push(budgetMs);
					await new Promise((resolve) => setTimeout(resolve, 60));
					throw new NodeOperationError(node, 'File(s) Selector is too complex', { itemIndex });
				});

			const context = mockDeep<IExecuteFunctions>();
			context.getNode.mockReturnValue(mock<INode>());
			context.getNodeParameter.mockImplementation((name) =>
				name === 'fileSelector' ? '/x/*a*a*a*b' : {},
			);
			context.continueOnFail.mockReturnValue(true);

			await execute.call(context, [{ json: {} }, { json: {} }]);

			expect(budgets).toHaveLength(2);
			expect(budgets[0]).toBe(readWriteUtils.GLOB_TIMEOUT_MS);
			expect(budgets[1]!).toBeLessThan(budgets[0]!);
		});
	});
});
