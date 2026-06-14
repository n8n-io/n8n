import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { Rocketchat } from '../Rocketchat.node';

type MockContext = {
	helpers: {
		requestWithAuthentication: jest.Mock;
		constructExecutionMetaData: jest.Mock;
		returnJsonArray: jest.Mock;
	};
	getNodeParameter: jest.Mock;
	getInputData: jest.Mock;
	getCredentials: jest.Mock;
	continueOnFail: jest.Mock;
};

describe('RocketChat Node', () => {
	let node: Rocketchat;

	beforeEach(() => {
		node = new Rocketchat();
		jest.clearAllMocks();
	});

	function createExecuteContext(params: Record<string, unknown> = {}): MockContext {
		const requestWithAuthentication = jest.fn();

		return {
			getNodeParameter: jest.fn(<T = unknown>(key: string): T => {
				const defaults: Record<string, unknown> = {
					options: {},
					jsonParameters: false,
					attachments: [],
				};

				return (params[key] ?? defaults[key]) as T;
			}),

			getInputData: jest.fn(() => [{ json: {} }]),

			helpers: {
				requestWithAuthentication,

				constructExecutionMetaData: jest.fn((data: unknown) => data),

				returnJsonArray: jest.fn(<T = unknown>(data: T | T[]): T[] => {
					return Array.isArray(data) ? data : [data];
				}),
			},

			getCredentials: jest.fn().mockResolvedValue({
				domain: 'https://chat.example.com',
			}),

			continueOnFail: jest.fn(() => false),
		};
	}

	// ---------------- chat.postMessage ----------------
	describe('execute - chat.postMessage', () => {
		it('should send message to RocketChat channel', async () => {
			const context = createExecuteContext({
				resource: 'chat',
				operation: 'postMessage',
				channel: '#general',
				text: 'hello world',
				options: {},
				jsonParameters: false,
				attachments: [],
			});

			context.helpers.requestWithAuthentication.mockResolvedValue({
				id: '123',
			});

			const result = await node.execute.call(context as unknown as IExecuteFunctions);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
			expect(result).toBeDefined();
		});

		it('should include alias, avatar, emoji when provided', async () => {
			const context = createExecuteContext({
				resource: 'chat',
				operation: 'postMessage',
				channel: '#general',
				text: 'hello',
				options: {
					alias: 'bot',
					avatar: 'http://avatar.com',
					emoji: ':smile:',
				},
				jsonParameters: false,
				attachments: [],
			});

			context.helpers.requestWithAuthentication.mockResolvedValue({ ok: true });

			await node.execute.call(context as unknown as IExecuteFunctions);

			const call = context.helpers.requestWithAuthentication.mock.calls[0] as [string, IDataObject];

			const body = call[1].body as IDataObject;

			expect(body.alias).toBe('bot');
			expect(body.avatar).toBe('http://avatar.com');
			expect(body.emoji).toBe(':smile:');
		});
	});

	// ---------------- subscriptions.get ----------------
	describe('execute - subscriptions.get', () => {
		it('should fetch subscriptions', async () => {
			const context = createExecuteContext({
				resource: 'subscriptions',
				operation: 'get',
			});

			context.helpers.requestWithAuthentication.mockResolvedValue({
				subscriptions: [],
			});

			await node.execute.call(context as unknown as IExecuteFunctions);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalled();
		});
	});

	// ---------------- subscriptions.read ----------------
	describe('execute - subscriptions.read', () => {
		it('should mark subscription as read', async () => {
			const context = createExecuteContext({
				resource: 'subscriptions',
				operation: 'read',
				roomId: 'ROOM1',
			});

			context.helpers.requestWithAuthentication.mockResolvedValue({ ok: true });

			await node.execute.call(context as unknown as IExecuteFunctions);

			const call = context.helpers.requestWithAuthentication.mock.calls[0] as [string, IDataObject];

			const body = call[1].body as IDataObject;

			expect(body.rid).toBe('ROOM1');
		});
	});

	// ---------------- im.messages ----------------
	describe('execute - im.messages', () => {
		it('should get IM messages', async () => {
			const context = createExecuteContext({
				resource: 'im',
				operation: 'messages',
				roomId: 'ROOM1',
			});

			context.helpers.requestWithAuthentication.mockResolvedValue({
				messages: [],
			});

			await node.execute.call(context as unknown as IExecuteFunctions);

			const call = context.helpers.requestWithAuthentication.mock.calls[0] as [string, IDataObject];

			const qs = call[1].qs as IDataObject;

			expect(qs.roomId).toBe('ROOM1');
		});
	});

	// ---------------- error handling ----------------
	describe('error handling', () => {
		it('should throw when API fails', async () => {
			const context = createExecuteContext({
				resource: 'chat',
				operation: 'postMessage',
				channel: '#general',
				text: 'hello',
			});

			context.helpers.requestWithAuthentication.mockRejectedValue(new Error('fail'));

			await expect(node.execute.call(context as unknown as IExecuteFunctions)).rejects.toThrow(
				'fail',
			);
		});

		it('should continue on fail when enabled', async () => {
			const context = createExecuteContext({
				resource: 'chat',
				operation: 'postMessage',
				channel: '#general',
				text: 'hello',
			});

			context.continueOnFail.mockReturnValue(true);

			context.helpers.requestWithAuthentication.mockRejectedValue(new Error('fail'));

			const result = await node.execute.call(context as unknown as IExecuteFunctions);

			expect(result).toBeDefined();
		});
	});
});
