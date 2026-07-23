import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { HITL_CALLBACK_PREFIX, InstanceSettings } from 'n8n-core';
import type { IHookFunctions, IWebhookFunctions, INode, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { apiRequest } from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { TelegramTrigger } from '../TelegramTrigger.node';

Container.set(InstanceSettings, { hmacSignatureSecret: 'test-hmac-secret' } as InstanceSettings);

vi.mock('../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../GenericFunctions');
	return {
		...originalModule,
		apiRequest: vi.fn(async function (method: string, query: string) {
			if (method === 'GET' && query.startsWith('getFile')) {
				return { result: { file_path: 'path/to/file' } };
			}
			if (method === 'GET' && !query) {
				return { body: 'test-file' };
			}
			return { result: { file_path: 'path/to/file' } };
		}),
	};
});

describe('TelegramTrigger', () => {
	let mockResult: Record<string, object>;

	const binaryData = {
		fileName: 'mocked-file',
		mimeType: 'image/png',
		data: Buffer.from('mocked-data'),
	};

	const createOptions = ({
		type,
		attachment,
		useChannelPost = false,
		imageSize = 'small',
	}: {
		type: string;
		attachment: any;
		useChannelPost?: boolean;
		imageSize?: string;
	}) => {
		const messageField = useChannelPost ? 'channel_post' : 'message';
		mockResult[messageField] = {
			chat: { id: 555 },
			from: { id: 666 },
			[type]: attachment,
		};

		return {
			helpers: {
				prepareBinaryData: vi.fn().mockResolvedValue(binaryData),
			},
			credential: {
				accessToken: '999999',
				baseUrl: 'https://api.telegram.org',
			},
			workflow: mock<Workflow>({ id: '1', active: true }),
			node: mock<INode>({
				id: '2',
				parameters: {
					additionalFields: {
						download: true,
						chatIds: '555',
						imageSize,
					},
				},
			}),
			headerData: {
				'x-telegram-bot-api-secret-token': '1_2',
			},
			bodyData: {
				[messageField]: {
					[type]: attachment,
					chat: { id: 555 },
					from: { id: 666 },
				},
			},
		};
	};

	beforeEach(() => {
		mockResult = {};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Webhook', () => {
		test('should return empty object in download files if attachment is not photo, video, or document', async () => {
			const options = createOptions({ type: 'text', attachment: 'Hello world!' });
			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, options);

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should set the image if it is coming for desktop telegram', async () => {
			const options = createOptions({
				type: 'photo',
				attachment: [{ file_id: 'photo0909' }],
				imageSize: 'desktop',
			});
			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, options);

			expect(responseData).toEqual({
				workflowData: [[{ json: mockResult, binary: { data: binaryData } }]],
			});
		});

		it.each([
			{ type: 'photo', attachment: [{ file_id: 'photo0909' }] },
			{ type: 'video', attachment: { file_id: 'vid666' } },
			{ type: 'document', attachment: { file_id: '0909' } },
		])(
			'should return downloaded files for %s attachments with channel_post',
			async ({ type, attachment }) => {
				const options = createOptions({ type, attachment, useChannelPost: true });
				const { responseData } = await testWebhookTriggerNode(TelegramTrigger, options);

				expect(responseData).toEqual({
					workflowData: [[{ json: mockResult, binary: { data: binaryData } }]],
				});
			},
		);

		it.each([
			{ type: 'photo', attachment: [{ file_id: 'photo0909' }] },
			{ type: 'video', attachment: { file_id: 'vid666' } },
			{ type: 'document', attachment: { file_id: '0909' } },
		])(
			'should return downloaded files for %s attachments with message',
			async ({ type, attachment }) => {
				const options = createOptions({ type, attachment });
				const { responseData } = await testWebhookTriggerNode(TelegramTrigger, options);

				expect(responseData).toEqual({
					workflowData: [[{ json: mockResult, binary: { data: binaryData } }]],
				});
			},
		);

		test('should receive a webhook event without downloading files', async () => {
			mockResult.message = {
				chat: { id: 555 },
				from: { id: 666 },
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '555',
							userIds: '666',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					message: {
						chat: { id: 555 },
						from: { id: 666 },
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should pass chatIds filter for callback_query events', async () => {
			mockResult.callback_query = {
				from: { id: 777 },
				message: {
					chat: { id: 555 },
					from: { id: 123 },
				},
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '555',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					callback_query: {
						from: { id: 777 },
						message: {
							chat: { id: 555 },
							from: { id: 123 },
						},
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should pass userIds filter for callback_query events', async () => {
			mockResult.callback_query = {
				from: { id: 777 },
				message: {
					chat: { id: 555 },
					from: { id: 123 },
				},
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							userIds: '777',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					callback_query: {
						from: { id: 777 },
						message: {
							chat: { id: 555 },
							from: { id: 123 },
						},
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should reject callback_query when chatId does not match', async () => {
			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '999',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					callback_query: {
						from: { id: 777 },
						message: {
							chat: { id: 555 },
							from: { id: 123 },
						},
					},
				},
			});

			expect(responseData).toEqual({});
		});

		test('should pass chatIds filter for edited_message events', async () => {
			mockResult.edited_message = {
				chat: { id: 555 },
				from: { id: 666 },
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '555',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					edited_message: {
						chat: { id: 555 },
						from: { id: 666 },
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should pass chatIds filter for channel_post events', async () => {
			mockResult.channel_post = {
				chat: { id: 555 },
				from: { id: 666 },
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '555',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					channel_post: {
						chat: { id: 555 },
						from: { id: 666 },
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
		});

		test('should reject events without a resolvable chat ID when chatIds filter is active', async () => {
			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							chatIds: '555',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					inline_query: {
						from: { id: 777 },
					},
				},
			});

			expect(responseData).toEqual({});
		});

		test('should reject events without a resolvable user ID when userIds filter is active', async () => {
			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({ id: '1', active: true }),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: false,
							userIds: '777',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					poll: {
						id: 'poll1',
					},
				},
			});

			expect(responseData).toEqual({});
		});

		describe('version 1.3 (legacy filter resolution)', () => {
			test('should drop callback_query when chatIds filter is set, matching only message updates', async () => {
				const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
					workflow: mock<Workflow>({ id: '1', active: true }),
					node: mock<INode>({
						id: '2',
						typeVersion: 1.3,
						parameters: {
							additionalFields: {
								download: false,
								chatIds: '555',
							},
						},
					}),
					headerData: {
						'x-telegram-bot-api-secret-token': '1_2',
					},
					bodyData: {
						callback_query: {
							from: { id: 777 },
							message: {
								chat: { id: 555 },
								from: { id: 123 },
							},
						},
					},
				});

				expect(responseData).toEqual({});
			});

			test('should drop callback_query when userIds filter is set, matching only message updates', async () => {
				const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
					workflow: mock<Workflow>({ id: '1', active: true }),
					node: mock<INode>({
						id: '2',
						typeVersion: 1.3,
						parameters: {
							additionalFields: {
								download: false,
								userIds: '777',
							},
						},
					}),
					headerData: {
						'x-telegram-bot-api-secret-token': '1_2',
					},
					bodyData: {
						callback_query: {
							from: { id: 777 },
							message: {
								chat: { id: 555 },
								from: { id: 123 },
							},
						},
					},
				});

				expect(responseData).toEqual({});
			});

			test('should still pass message updates matching the chatIds filter', async () => {
				mockResult.message = {
					chat: { id: 555 },
					from: { id: 666 },
				};

				const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
					workflow: mock<Workflow>({ id: '1', active: true }),
					node: mock<INode>({
						id: '2',
						typeVersion: 1.3,
						parameters: {
							additionalFields: {
								download: false,
								chatIds: '555',
								userIds: '666',
							},
						},
					}),
					headerData: {
						'x-telegram-bot-api-secret-token': '1_2',
					},
					bodyData: {
						message: {
							chat: { id: 555 },
							from: { id: 666 },
						},
					},
				});

				expect(responseData).toEqual({ workflowData: [[{ json: mockResult }]] });
			});
		});
	});

	describe('HITL callback forwarding', () => {
		test('forwards to the configured waiting-webhook path instead of a hardcoded one', async () => {
			Container.set(
				GlobalConfig,
				mock<GlobalConfig>({ endpoints: { webhookWaiting: 'custom-waiting' } as never }),
			);
			const httpRequest = vi.fn().mockResolvedValue({});
			const telegramTrigger = new TelegramTrigger();
			const webhookFunctions = mock<IWebhookFunctions>({
				helpers: mock<IWebhookFunctions['helpers']>({ httpRequest }),
				getNode: () => mock<INode>({ id: '2', typeVersion: 1.5 }),
				getWorkflow: () => mock<Workflow>({ id: '1' }),
				getNodeWebhookUrl: () => 'https://mybot.example.com/custom-waiting/webhook/abc/webhook',
				getBodyData: () => ({
					callback_query: { data: `${HITL_CALLBACK_PREFIX}42|a|deadbeef` },
				}),
				getHeaderData: () => ({ 'x-telegram-bot-api-secret-token': '1_2' }),
				getCredentials: async <T extends object>() => ({ accessToken: '123456:test-token' }) as T,
				getNodeParameter: () => [],
			});

			await telegramTrigger.webhook.call(webhookFunctions);

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: 'https://mybot.example.com/custom-waiting-telegram' }),
			);
		});

		test('preserves a reverse-proxy path prefix instead of forwarding to the origin root', async () => {
			// e.g. n8n served under https://example.com/n8n-instance/ : the own webhook URL
			// carries that prefix before the live-webhook segment, and it must survive.
			Container.set(
				GlobalConfig,
				mock<GlobalConfig>({
					endpoints: { webhook: 'webhook', webhookWaiting: 'webhook-waiting' } as never,
				}),
			);
			const httpRequest = vi.fn().mockResolvedValue({});
			const telegramTrigger = new TelegramTrigger();
			const webhookFunctions = mock<IWebhookFunctions>({
				helpers: mock<IWebhookFunctions['helpers']>({ httpRequest }),
				getNode: () => mock<INode>({ id: '2', typeVersion: 1.5 }),
				getWorkflow: () => mock<Workflow>({ id: '1' }),
				getNodeWebhookUrl: () => 'https://example.com/n8n-instance/webhook/abc/webhook',
				getBodyData: () => ({
					callback_query: { data: `${HITL_CALLBACK_PREFIX}42|a|deadbeef` },
				}),
				getHeaderData: () => ({ 'x-telegram-bot-api-secret-token': '1_2' }),
				getCredentials: async <T extends object>() => ({ accessToken: '123456:test-token' }) as T,
				getNodeParameter: () => [],
			});

			await telegramTrigger.webhook.call(webhookFunctions);

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://example.com/n8n-instance/webhook-waiting-telegram',
				}),
			);
		});
	});

	describe('create', () => {
		test('should set drop_pending_updates for version 1.3', async () => {
			const telegramTrigger = new TelegramTrigger();
			const mockHookFunctions = mock<IHookFunctions>({
				getNodeWebhookUrl: vi.fn().mockReturnValue('https://example.com/webhook'),
				getNodeParameter: vi.fn().mockReturnValue(['message']),
				getNode: vi.fn().mockReturnValue({ id: '2', typeVersion: 1.3 }),
				getWorkflow: vi.fn().mockReturnValue({ id: '1' }),
			});

			await telegramTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
				'POST',
				'setWebhook',
				expect.objectContaining({
					drop_pending_updates: true,
				}),
			);
		});

		test('should not set drop_pending_updates for version 1.2', async () => {
			const telegramTrigger = new TelegramTrigger();
			const mockHookFunctions = mock<IHookFunctions>({
				getNodeWebhookUrl: vi.fn().mockReturnValue('https://example.com/webhook'),
				getNodeParameter: vi.fn().mockReturnValue(['*']),
				getNode: vi.fn().mockReturnValue({ id: '2', typeVersion: 1.2 }),
				getWorkflow: vi.fn().mockReturnValue({ id: '1' }),
			});

			await telegramTrigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
				'POST',
				'setWebhook',
				expect.objectContaining({
					drop_pending_updates: false,
				}),
			);
		});
	});
});
