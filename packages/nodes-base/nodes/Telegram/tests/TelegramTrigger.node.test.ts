import { mock } from 'jest-mock-extended';
import { type INode, type Workflow } from 'n8n-workflow';

import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { TelegramTrigger } from '../TelegramTrigger.node';

jest.mock('../GenericFunctions', () => {
	const originalModule = jest.requireActual('../GenericFunctions');
	return {
		...originalModule,
		apiRequest: jest.fn(async function (method: string, query: string) {
			if (method === 'GET' && query.startsWith('getFile')) {
				return {
					result: {
						file_path: 'path/to/file',
					},
				};
			}
			if (method === 'GET' && !query) {
				return {
					body: 'test-file',
				};
			}
			return {
				status: 'success',
				data: {
					windowId: 'win-123',
				},
			};
		}),
	};
});

describe('TelegramTrigger', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Webhook', () => {
		test('should return downloaded files if there are any  attachments', async () => {
			const binaryData = {
				fileName: 'mocked-file',
				mimeType: 'image/png',
				data: Buffer.from('mocked-data'),
			};

			const event = {
				message: {
					chat: {
						id: 555,
					},
					from: {
						id: 666,
					},
					photo: [{ file_id: '0909' }],
					document: [{ file_id: '339' }],
					video: [{ file_id: '666' }],
				},
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				helpers: {
					prepareBinaryData: jest.fn().mockResolvedValue(binaryData),
				},
				credential: {
					accessToken: '999999',
					baseUrl: 'https://api.telegram.org',
				},
				workflow: mock<Workflow>({
					id: '1',
					active: true,
				}),
				node: mock<INode>({
					id: '2',
					parameters: {
						additionalFields: {
							download: true,
							chatIds: '555',
							userIds: '666',
							imageSize: 'small',
						},
					},
				}),
				headerData: {
					'x-telegram-bot-api-secret-token': '1_2',
				},
				bodyData: {
					message: {
						photo: [{ file_id: '0909' }],
						document: [{ file_id: '339' }],
						video: [{ file_id: '666' }],
						chat: {
							id: 555,
						},
						from: {
							id: 666,
						},
					},
				},
			});

			expect(responseData).toEqual({
				workflowData: [[{ json: event, binary: { data: binaryData } }]],
			});
		});

		test('should receive a webhook event', async () => {
			const event = {
				message: {
					chat: {
						id: 555,
					},
					from: {
						id: 666,
					},
				},
			};

			const { responseData } = await testWebhookTriggerNode(TelegramTrigger, {
				workflow: mock<Workflow>({
					id: '1',
					active: true,
				}),
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
						chat: {
							id: 555,
						},
						from: {
							id: 666,
						},
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});
	});
});
