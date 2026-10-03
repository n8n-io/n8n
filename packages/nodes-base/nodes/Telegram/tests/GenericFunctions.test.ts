import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type IWebhookFunctions,
} from 'n8n-workflow';

import {
	addAdditionalFields,
	apiRequest,
	getPropertyName,
	getSecretToken,
	materializeRichMessageLineBreaks,
} from '../GenericFunctions';
import type { Mock } from 'vitest';

describe('Telegram > GenericFunctions', () => {
	describe('apiRequest', () => {
		let mockThis: IHookFunctions & IExecuteFunctions & ILoadOptionsFunctions & IWebhookFunctions;
		const credentials = { baseUrl: 'https://api.telegram.org', accessToken: 'testToken' };
		beforeEach(() => {
			mockThis = {
				getCredentials: vi.fn(),
				helpers: {
					request: vi.fn(),
				},
				getNode: vi.fn(),
			} as unknown as IHookFunctions &
				IExecuteFunctions &
				ILoadOptionsFunctions &
				IWebhookFunctions;

			vi.clearAllMocks();
		});

		it('should make a successful API request', async () => {
			const method: IHttpRequestMethods = 'POST';
			const endpoint = 'sendMessage';
			const body: IDataObject = { text: 'Hello, world!' };
			const query: IDataObject = { chat_id: '12345' };
			const option: IDataObject = { headers: { 'Custom-Header': 'value' } };

			(mockThis.getCredentials as Mock).mockResolvedValue(credentials);
			(mockThis.helpers.request as Mock).mockResolvedValue({ success: true });

			const result = await apiRequest.call(mockThis, method, endpoint, body, query, option);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('telegramApi');
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				headers: { 'Custom-Header': 'value' },
				method: 'POST',
				uri: 'https://api.telegram.org/bottestToken/sendMessage',
				body: { text: 'Hello, world!' },
				qs: { chat_id: '12345' },
				json: true,
			});
			expect(result).toEqual({ success: true });
		});

		it('should handle an API request with no body and query', async () => {
			const method: IHttpRequestMethods = 'GET';
			const endpoint = 'getMe';
			const body: IDataObject = {};
			const query: IDataObject = {};

			(mockThis.getCredentials as Mock).mockResolvedValue(credentials);
			(mockThis.helpers.request as Mock).mockResolvedValue({ success: true });

			const result = await apiRequest.call(mockThis, method, endpoint, body, query);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('telegramApi');
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				headers: {},
				method: 'GET',
				uri: 'https://api.telegram.org/bottestToken/getMe',
				json: true,
			});
			expect(result).toEqual({ success: true });
		});

		it('should handle an API request with no additional options', async () => {
			const method: IHttpRequestMethods = 'POST';
			const endpoint = 'sendMessage';
			const body: IDataObject = { text: 'Hello, world!' };

			(mockThis.getCredentials as Mock).mockResolvedValue(credentials);
			(mockThis.helpers.request as Mock).mockResolvedValue({ success: true });

			const result = await apiRequest.call(mockThis, method, endpoint, body);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('telegramApi');
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				headers: {},
				method: 'POST',
				uri: 'https://api.telegram.org/bottestToken/sendMessage',
				body: { text: 'Hello, world!' },
				json: true,
			});
			expect(result).toEqual({ success: true });
		});

		it('should throw a NodeApiError on request failure', async () => {
			const method: IHttpRequestMethods = 'POST';
			const endpoint = 'sendMessage';
			const body: IDataObject = { text: 'Hello, world!' };

			(mockThis.getCredentials as Mock).mockResolvedValue(credentials);
			(mockThis.helpers.request as Mock).mockRejectedValue(new Error('Request failed'));

			await expect(apiRequest.call(mockThis, method, endpoint, body)).rejects.toThrow(NodeApiError);

			expect(mockThis.getCredentials).toHaveBeenCalledWith('telegramApi');
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				headers: {},
				method: 'POST',
				uri: 'https://api.telegram.org/bottestToken/sendMessage',
				body: { text: 'Hello, world!' },
				json: true,
			});
		});
	});
	describe('addAdditionalFields', () => {
		let mockThis: IExecuteFunctions;

		beforeEach(() => {
			mockThis = {
				getNodeParameter: vi.fn(),
			} as unknown as IExecuteFunctions;

			vi.clearAllMocks();
		});

		it('should add additional fields and attribution for sendMessage operation', () => {
			const body: IDataObject = { text: 'Hello, world!' };
			const index = 0;
			const nodeVersion = 1.1;
			const instanceId = '45';

			(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'operation':
						return 'sendMessage';
					case 'additionalFields':
						return { appendAttribution: true };
					case 'replyMarkup':
						return 'none';
					default:
						return '';
				}
			});

			addAdditionalFields.call(mockThis, body, index, nodeVersion, instanceId);

			expect(body).toEqual({
				text: 'Hello, world!\n\n_This message was sent automatically with _[n8n](https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_45)',
				parse_mode: 'Markdown',
				disable_web_page_preview: true,
			});
		});

		it('should add reply markup for inlineKeyboard', () => {
			const body: IDataObject = { text: 'Hello, world!' };
			const index = 0;

			(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'operation':
						return 'sendMessage';
					case 'additionalFields':
						return {};
					case 'replyMarkup':
						return 'inlineKeyboard';
					case 'inlineKeyboard':
						return {
							rows: [
								{
									row: {
										buttons: [
											{ text: 'Button 1', additionalFields: { url: 'https://example.com' } },
											{ text: 'Button 2' },
										],
									},
								},
							],
						};
					default:
						return '';
				}
			});

			addAdditionalFields.call(mockThis, body, index);

			expect(body).toEqual({
				text: 'Hello, world!',
				disable_web_page_preview: true,
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Button 1', url: 'https://example.com' }, { text: 'Button 2' }],
					],
				},
			});
		});

		it('should add reply markup for forceReply', () => {
			const body: IDataObject = { text: 'Hello, world!' };
			const index = 0;

			(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'operation':
						return 'sendMessage';
					case 'additionalFields':
						return {};
					case 'replyMarkup':
						return 'forceReply';
					case 'forceReply':
						return { force_reply: true };
					default:
						return '';
				}
			});

			addAdditionalFields.call(mockThis, body, index);

			expect(body).toEqual({
				text: 'Hello, world!',
				disable_web_page_preview: true,
				parse_mode: 'Markdown',
				reply_markup: { force_reply: true },
			});
		});

		it('should add reply markup for replyKeyboardRemove', () => {
			const body: IDataObject = { text: 'Hello, world!' };
			const index = 0;

			(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'operation':
						return 'sendMessage';
					case 'additionalFields':
						return {};
					case 'replyMarkup':
						return 'replyKeyboardRemove';
					case 'replyKeyboardRemove':
						return { remove_keyboard: true };
					default:
						return '';
				}
			});

			addAdditionalFields.call(mockThis, body, index);

			expect(body).toEqual({
				text: 'Hello, world!',
				disable_web_page_preview: true,
				parse_mode: 'Markdown',
				reply_markup: { remove_keyboard: true },
			});
		});

		it('should handle nodeVersion 1.2 and set disable_web_page_preview', () => {
			const body: IDataObject = { text: 'Hello, world!' };
			const index = 0;
			const nodeVersion = 1.2;

			(mockThis.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'operation':
						return 'sendMessage';
					case 'additionalFields':
						return {};
					case 'replyMarkup':
						return 'none';
					default:
						return '';
				}
			});

			addAdditionalFields.call(mockThis, body, index, nodeVersion);

			expect(body).toEqual({
				disable_web_page_preview: true,
				parse_mode: 'Markdown',
				text: 'Hello, world!\n\n_This message was sent automatically with _[n8n](https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram)',
			});
		});
	});
	describe('getPropertyName', () => {
		it('should return the property name by removing "send" and converting to lowercase', () => {
			expect(getPropertyName('sendMessage')).toBe('message');
			expect(getPropertyName('sendEmail')).toBe('email');
			expect(getPropertyName('sendNotification')).toBe('notification');
		});

		it('should return the original string in lowercase if it does not contain "send"', () => {
			expect(getPropertyName('receiveMessage')).toBe('receivemessage');
			expect(getPropertyName('fetchData')).toBe('fetchdata');
		});

		it('should return an empty string if the input is "send"', () => {
			expect(getPropertyName('send')).toBe('');
		});

		it('should handle empty strings', () => {
			expect(getPropertyName('')).toBe('');
		});
	});
	describe('materializeRichMessageLineBreaks', () => {
		it('converts a single line break into a hard break, for both formats', () => {
			expect(materializeRichMessageLineBreaks('string1\nstring2', 'markdown')).toBe(
				'string1<br>\nstring2',
			);
			expect(materializeRichMessageLineBreaks('string1\nstring2', 'html')).toBe(
				'string1<br>\nstring2',
			);
		});

		it('leaves an existing paragraph break (blank line) untouched', () => {
			const content = 'string1\nstring2\n\nstring3';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'string1<br>\nstring2\n\nstring3',
			);
		});

		it('reproduces the reported bug scenario end to end', () => {
			// https://github.com/n8n-io/n8n/issues/37361
			const content = '{{ $json.text}}\n\nstring4\nstring5\n\nline 6';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'{{ $json.text}}\n\nstring4<br>\nstring5\n\nline 6',
			);
		});

		it('does not touch line breaks inside a fenced code block', () => {
			const content = 'before\n```\ncode1\ncode2\n```\nafter';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'before<br>\n```\ncode1\ncode2\n```\nafter',
			);
		});

		it('does not touch line breaks inside markdown table rows', () => {
			const content = 'text\n| A | B |\n|---|---|\n| 1 | 2 |\nmore text';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'text\n| A | B |\n|---|---|\n| 1 | 2 |\nmore text',
			);
		});

		it('does not touch line breaks inside an HTML <pre> block', () => {
			// The lines *inside* <pre>...</pre> stay untouched. A <br> after the closing
			// tag is fine: it lands in the outer flow, once the block has already closed.
			const content = 'before\n<pre>\ncode1\ncode2\n</pre>\nafter';
			expect(materializeRichMessageLineBreaks(content, 'html')).toBe(
				'before<br>\n<pre>\ncode1\ncode2\n</pre><br>\nafter',
			);
		});

		it('returns content with no line breaks unchanged', () => {
			expect(materializeRichMessageLineBreaks('<b>Hello</b>', 'html')).toBe('<b>Hello</b>');
		});
	});

	describe('getSecretToken', () => {
		const mockThis = {
			getWorkflow: vi.fn().mockReturnValue({ id: 'workflow123' }),
			getNode: vi.fn().mockReturnValue({ id: 'node123' }),
		} as unknown as IHookFunctions & IWebhookFunctions;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return a valid secret token', () => {
			const secretToken = getSecretToken.call(mockThis);

			expect(secretToken).toBe('workflow123_node123');
		});

		it('should remove invalid characters from the secret token', () => {
			mockThis.getNode().id = 'node@123';
			mockThis.getWorkflow().id = 'workflow#123';

			const secretToken = getSecretToken.call(mockThis);
			expect(secretToken).toBe('workflow123_node123');
		});
	});
});
