import type {
	IExecuteSingleFunctions,
	INodeExecutionData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

import { taskPostReceiceAction } from '../GenericFunctions';

describe('taskPostReceiceAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn((parameterName: string) => {
				if (parameterName === 'contactId') return '12345';
				return undefined;
			}),
		};
	});

	it('should add contactId to each item in items', async () => {
		const items: INodeExecutionData[] = [
			{ json: { field1: 'value1' } },
			{ json: { field2: 'value2' } },
		];

		const response: IN8nHttpFullResponse = {
			body: {},
			headers: {},
			statusCode: 200,
		};

		const result = await taskPostReceiceAction.call(
			mockThis as IExecuteSingleFunctions,
			items,
			response,
		);

		expect(result).toEqual([
			{ json: { field1: 'value1', contactId: '12345' } },
			{ json: { field2: 'value2', contactId: '12345' } },
		]);
		expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
	});

	it('should not modify other fields in items', async () => {
		const items: INodeExecutionData[] = [{ json: { name: 'John Doe' } }, { json: { age: 30 } }];

		const response: IN8nHttpFullResponse = {
			body: {},
			headers: {},
			statusCode: 200,
		};

		const result = await taskPostReceiceAction.call(
			mockThis as IExecuteSingleFunctions,
			items,
			response,
		);

		expect(result).toEqual([
			{ json: { name: 'John Doe', contactId: '12345' } },
			{ json: { age: 30, contactId: '12345' } },
		]);
		expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
	});

	it('should return an empty array if items is empty', async () => {
		const items: INodeExecutionData[] = [];

		const response: IN8nHttpFullResponse = {
			body: {},
			headers: {},
			statusCode: 200,
		};

		const result = await taskPostReceiceAction.call(
			mockThis as IExecuteSingleFunctions,
			items,
			response,
		);

		expect(result).toEqual([]);
		expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
	});
});
