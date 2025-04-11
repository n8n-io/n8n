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
				prepareBinaryData: jest.fn().mockResolvedValue(binaryData),
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
		jest.clearAllMocks();
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
	});
});
