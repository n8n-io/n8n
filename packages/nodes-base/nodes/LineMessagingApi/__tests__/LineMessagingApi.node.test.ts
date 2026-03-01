import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { LineMessagingApi } from '../LineMessagingApi.node';

jest.mock('../GenericFunctions', () => {
	const originalModule = jest.requireActual('../GenericFunctions');
	return {
		...originalModule,
		lineApiRequest: jest.fn(),
	};
});

describe('LineMessagingApi node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const lineApiRequestMock = jest.mocked(GenericFunctions.lineApiRequest);
	const node = new LineMessagingApi();

	beforeEach(() => {
		jest.resetAllMocks();
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);
		lineApiRequestMock.mockResolvedValue({});
	});

	describe('message:reply', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'reply';
					case 'replyToken':
						return 'test-reply-token';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
		});

		it('should call the reply endpoint with the correct body', async () => {
			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/reply', {
				replyToken: 'test-reply-token',
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});

		it('should return the API response as output', async () => {
			lineApiRequestMock.mockResolvedValue({ sentMessages: [{ id: '123', quoteToken: 'qt' }] });

			const result = await node.execute.call(executeFunctionsMock);

			expect(result[0][0].json).toEqual({ sentMessages: [{ id: '123', quoteToken: 'qt' }] });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should accept messages as a pre-parsed array', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'reply';
					case 'replyToken':
						return 'test-reply-token';
					case 'messages':
						return [{ type: 'text', text: 'Hello' }];
					default:
						return undefined;
				}
			});

			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/reply', {
				replyToken: 'test-reply-token',
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});
	});

	describe('message:push', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'push';
					case 'userId':
						return 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
		});

		it('should call the push endpoint with the correct body', async () => {
			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/push', {
				to: 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});
	});

	describe('message:multicast', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'multicast';
					case 'userIds':
						return 'Uxxxxxxx, Uyyyyyyy, Uzzzzzzz';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
		});

		it('should call the multicast endpoint with split and trimmed user IDs', async () => {
			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/multicast', {
				to: ['Uxxxxxxx', 'Uyyyyyyy', 'Uzzzzzzz'],
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});

		it('should filter out empty entries from the user ID list', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'multicast';
					case 'userIds':
						return 'Uxxxxxxx,,Uyyyyyyy,';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});

			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/multicast', {
				to: ['Uxxxxxxx', 'Uyyyyyyy'],
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});
	});

	describe('message:broadcast', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'broadcast';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
		});

		it('should call the broadcast endpoint with the message body only', async () => {
			await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledWith('POST', '/v2/bot/message/broadcast', {
				messages: [{ type: 'text', text: 'Hello' }],
			});
		});
	});

	describe('multiple items', () => {
		it('should process each input item and collect results', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			executeFunctionsMock.getNodeParameter.mockImplementation((param, index) => {
				switch (param) {
					case 'operation':
						return 'push';
					case 'userId':
						return index === 0 ? 'UserA' : 'UserB';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
			lineApiRequestMock.mockResolvedValue({ sentMessages: [{ id: '1' }] });

			const result = await node.execute.call(executeFunctionsMock);

			expect(lineApiRequestMock).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
		});
	});

	describe('error handling', () => {
		it('should rethrow the error when continueOnFail is false', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'broadcast';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
			lineApiRequestMock.mockRejectedValue(new Error('API error'));

			await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow('API error');
		});

		it('should return error data when continueOnFail is true', async () => {
			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			executeFunctionsMock.getNodeParameter.mockImplementation((param) => {
				switch (param) {
					case 'operation':
						return 'broadcast';
					case 'messages':
						return '[{"type":"text","text":"Hello"}]';
					default:
						return undefined;
				}
			});
			lineApiRequestMock.mockRejectedValue(new Error('API error'));

			const result = await node.execute.call(executeFunctionsMock);

			expect(result[0][0].json).toEqual({ error: 'API error' });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});
	});
});
