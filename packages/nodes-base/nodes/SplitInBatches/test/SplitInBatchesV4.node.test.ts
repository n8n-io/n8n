import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SplitInBatchesV4 } from '../v4/SplitInBatchesV4.node';

describe('SplitInBatchesV4', () => {
	const node = new SplitInBatchesV4();
	const items: INodeExecutionData[] = [{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }];

	function makeContext(parameters: Record<string, unknown>) {
		const context = mock<IExecuteFunctions>();
		const nodeContext: Record<string, unknown> = {};
		context.getNode.mockReturnValue(mock<INode>({ name: 'Loop Over Items' }));
		context.getInputData.mockReturnValue(items);
		context.getContext.mockReturnValue(nodeContext);
		context.getInputSourceData.mockReturnValue({ previousNode: 'Start' });
		context.getNodeParameter.mockImplementation(
			(name: string, _index?: number, fallback?: unknown) =>
				(parameters[name] ?? fallback) as never,
		);
		return context;
	}

	it('adds the parallel options and keeps the v3 parameters', () => {
		const names = node.description.properties.map((property) => property.name);

		expect(node.description.version).toBe(4);
		expect(names).toEqual([
			'splitInBatchesNotice',
			'batchSize',
			'runInParallel',
			'parallelNotice',
			'maxConcurrency',
			'options',
		]);
	});

	it('runs like v3 when parallel is off', async () => {
		const context = makeContext({ batchSize: 2, options: {} });

		const result = await node.execute.call(context);

		expect(result).toEqual([[], [items[0], items[1]]]);
	});

	it('fails on engine v1 when parallel is on', async () => {
		const context = makeContext({ batchSize: 2, runInParallel: true, maxConcurrency: 3 });

		await expect(node.execute.call(context)).rejects.toThrow(NodeOperationError);
		await expect(node.execute.call(context)).rejects.toThrow(/only supported on engine v2/);
	});
});
