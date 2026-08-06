import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

import { dueDatePreSendAction } from '../GenericFunctions';
import type { Mock } from 'vitest';

describe('dueDatePreSendAction', () => {
	let mockThis: IExecuteSingleFunctions;

	beforeEach(() => {
		mockThis = {
			getNode: vi.fn(
				() =>
					({
						id: 'mock-node-id',
						name: 'mock-node',
						typeVersion: 1,
						type: 'n8n-nodes-base.mockNode',
						position: [0, 0],
						parameters: {},
					}) as INode,
			),
			getNodeParameter: vi.fn(),
			getInputData: vi.fn(),
			helpers: {} as any,
		} as unknown as IExecuteSingleFunctions;

		vi.clearAllMocks();
	});

	it('should add formatted dueDate to requestOptions.body if dueDate is provided directly', async () => {
		(mockThis.getNodeParameter as Mock).mockReturnValueOnce('2024-12-25');

		const requestOptions: IHttpRequestOptions = { url: 'https://example.com/api' };

		const result = await dueDatePreSendAction.call(mockThis, requestOptions);

		expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
	});

	it('should add formatted dueDate to requestOptions.body if dueDate is provided in updateFields', async () => {
		(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'dueDate') return null;
			if (paramName === 'updateFields') return { dueDate: '2024-12-25' };
			return undefined;
		});

		const requestOptions: IHttpRequestOptions = { url: 'https://example.com/api' };

		const result = await dueDatePreSendAction.call(mockThis, requestOptions);

		expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
	});

	it('should initialize body as an empty object if it is undefined', async () => {
		(mockThis.getNodeParameter as Mock).mockReturnValueOnce('2024-12-25');

		const requestOptions: IHttpRequestOptions = { url: 'https://example.com/api', body: undefined };

		const result = await dueDatePreSendAction.call(mockThis, requestOptions);

		expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
	});
});
