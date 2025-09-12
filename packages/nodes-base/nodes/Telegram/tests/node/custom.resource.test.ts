import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { Telegram } from '../../Telegram.node';

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Telegram node: Custom resource', () => {
	let telegram: Telegram;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		telegram = new Telegram();
		mockExecuteFunctions = mock<IExecuteFunctions>();

		// minimal helpers used by execute path
		(mockExecuteFunctions.helpers as any) = {
			constructExecutionMetaData: jest.fn().mockImplementation((data: any) => data),
			returnJsonArray: jest
				.fn()
				.mockImplementation((data: any) => (Array.isArray(data) ? data : [data])),
		};

		// avoid undefined access
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.continueOnFail.mockReturnValue(false as any);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call Telegram API with provided operation and payload', async () => {
		const items = [{ json: {} }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);

		// Top-level parameters (pre-loop)
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('noop') // operation at index 0 (not SEND_AND_WAIT)
			.mockReturnValueOnce('custom') // resource at index 0
			.mockReturnValueOnce(false); // binaryData at index 0

		// Inside loop for custom resource
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('sendMessage') // custom operation (method/endpoint)
			.mockReturnValueOnce({ chat_id: '123', text: 'Hello from custom' }); // payload

		(jest.mocked(genericFunctions.apiRequest) as jest.Mock).mockResolvedValue({ ok: true });

		await expect(telegram.execute.call(mockExecuteFunctions)).resolves.toBeTruthy();

		expect(genericFunctions.apiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith(
			'POST',
			'sendMessage',
			{ chat_id: '123', text: 'Hello from custom' },
			{},
		);
	});
});
