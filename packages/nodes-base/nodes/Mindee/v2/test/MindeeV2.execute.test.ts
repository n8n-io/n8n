import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { MindeeV2 } from '../MindeeV2.node';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe('MindeeV2 > execute', () => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.svg',
		group: ['input'],
		description: 'Consume Mindee API',
	};

	function createContext(operation: string, continueOnFail: boolean) {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 4 }));
		context.getNodeParameter.mockReturnValue(operation as never);
		context.continueOnFail.mockReturnValue(continueOnFail);
		context.helpers.returnJsonArray.mockImplementation((items) =>
			(Array.isArray(items) ? items : [items]).map((json) => ({ json })),
		);
		context.helpers.constructExecutionMetaData.mockImplementation((items, { itemData }) =>
			items.map((item) => ({ ...item, pairedItem: itemData })),
		);
		return context;
	}

	function createUrlContext(continueOnFail: boolean) {
		const context = createContext('extraction', continueOnFail);
		const parameters: Record<string, unknown> = {
			operation: 'extraction',
			modelId: 'model-id',
			options: { rag: 'true' },
			documentSource: 'url',
			documentUrl: 'https://example.com/invoice.pdf',
		};
		context.getNodeParameter.mockImplementation(
			(name: string, _index: number, fallback?: unknown) => (parameters[name] ?? fallback) as never,
		);
		return context;
	}

	it('should reject an operation outside the allow-list', async () => {
		const node = new MindeeV2(baseDescription);

		await expect(node.execute.call(createContext('../jobs', false))).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should return the error with its paired item when continue on fail is on', async () => {
		const node = new MindeeV2(baseDescription);

		const [output] = await node.execute.call(createContext('../jobs', true));

		expect(output).toEqual([
			{ json: { error: 'Unknown operation: ../jobs' }, pairedItem: { item: 0 } },
		]);
	});

	it('should enqueue the document, poll the job and pair the result with its input item', async () => {
		const context = createUrlContext(false);
		const inference = { inference: { id: 'inference-id' } };
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({
				job: { polling_url: 'https://api-v2.mindee.net/v2/jobs/job-id' },
			})
			.mockResolvedValueOnce({ job: { status: 'Processing' } })
			.mockResolvedValueOnce(inference);

		const [output] = await new MindeeV2(baseDescription).execute.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'mindeeApi',
			expect.objectContaining({
				method: 'POST',
				url: expect.objectContaining({
					value: 'https://api-v2.mindee.net/v2/products/extraction/enqueue',
				}),
			}),
		);
		expect(output).toEqual([{ json: inference, pairedItem: { item: 0 } }]);
	});

	it('should throw when the enqueue request fails', async () => {
		const context = createUrlContext(false);
		context.helpers.httpRequestWithAuthentication.mockRejectedValue(new Error('unauthorized'));

		await expect(new MindeeV2(baseDescription).execute.call(context)).rejects.toThrow();
	});

	it('should return the API error with its paired item when continue on fail is on', async () => {
		const context = createUrlContext(true);
		context.helpers.httpRequestWithAuthentication.mockRejectedValue(new Error('unauthorized'));

		const [output] = await new MindeeV2(baseDescription).execute.call(context);

		expect(output).toEqual([{ json: { error: 'unauthorized' }, pairedItem: { item: 0 } }]);
	});
});
