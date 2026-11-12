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
				'before\n```\ncode1\ncode2\n```\nafter',
			);
		});

		it('does not close a longer fence on a shorter, same-character delimiter inside it', () => {
			// A line of three backticks inside a four-backtick-fenced block is fence
			// content, not a closer - only a run of four or more backticks closes it.
			const content = 'before\n````\ncode1\n```\ncode2\n````\nafter';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'before\n````\ncode1\n```\ncode2\n````\nafter',
			);
		});

		it('does not touch line breaks inside markdown table rows', () => {
			const content = 'text\n| A | B |\n|---|---|\n| 1 | 2 |\nmore text';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'text\n| A | B |\n|---|---|\n| 1 | 2 |\nmore text',
			);
		});

		it('does not touch line breaks inside an HTML <pre> block', () => {
			// <pre> is a block tag, so no <br> goes next to it either.
			const content = 'before\n<pre>\ncode1\ncode2\n</pre>\nafter';
			expect(materializeRichMessageLineBreaks(content, 'html')).toBe(
				'before\n<pre>\ncode1\ncode2\n</pre>\nafter',
			);
		});

		it('does not add a second break after an existing Markdown hard break', () => {
			// A trailing, unescaped backslash is Markdown's own hard-break syntax.
			expect(materializeRichMessageLineBreaks('string1\\\nstring2', 'markdown')).toBe(
				'string1\\\nstring2',
			);
		});

		it('still breaks a line ending in an escaped backslash', () => {
			// Two trailing backslashes is one escaped backslash, not a hard break.
			expect(materializeRichMessageLineBreaks('string1\\\\\nstring2', 'markdown')).toBe(
				'string1\\\\<br>\nstring2',
			);
		});

		it('does not add a second break after a line that already ends with <br>', () => {
			for (const format of ['markdown', 'html'] as const) {
				expect(materializeRichMessageLineBreaks('a<br>\nb<br/>\nc<BR />\nd', format)).toBe(
					'a<br>\nb<br/>\nc<BR />\nd',
				);
				expect(materializeRichMessageLineBreaks('a\n<br>b', format)).toBe('a\n<br>b');
			}
		});

		it('does not add a second break after two trailing spaces in Markdown', () => {
			expect(materializeRichMessageLineBreaks('a  \nb', 'markdown')).toBe('a  \nb');
		});

		it('keeps CRLF line endings intact', () => {
			expect(materializeRichMessageLineBreaks('a\r\nb\r\n\r\nc', 'markdown')).toBe(
				'a<br>\r\nb\r\n\r\nc',
			);
			expect(materializeRichMessageLineBreaks('a\\\r\nb', 'markdown')).toBe('a\\\r\nb');
		});

		it('does not add breaks between HTML list and table tags', () => {
			const list = '<ul>\n<li>one</li>\n<li>two</li>\n</ul>\nafter';
			expect(materializeRichMessageLineBreaks(list, 'html')).toBe(list);

			const table = '<table>\n<tr>\n<td>1</td>\n<td>2</td>\n</tr>\n</table>';
			expect(materializeRichMessageLineBreaks(table, 'html')).toBe(table);
		});

		it('still breaks lines of text inside an HTML list item', () => {
			expect(materializeRichMessageLineBreaks('<li>line1\nline2</li>', 'html')).toBe(
				'<li>line1<br>\nline2</li>',
			);
		});

		it('does not break thematic breaks or setext headings', () => {
			for (const content of [
				'a\n---\nb',
				'a\n***\nb',
				'a\n___\nb',
				'a\n- - -\nb',
				'Title\n===\nb',
				'Title\n---',
			]) {
				expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
			}
		});

		it('does not add breaks around ATX headings', () => {
			const content = 'a\n# Heading\nb\n### Sub\nc';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
		});

		it('does not add breaks around a line that starts with a hashtag', () => {
			// Telegram shows `#news` as a heading, the same as `# news`.
			const content = 'text\n#news\ntoday';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
		});

		it('does not add breaks between list items or before a block quote', () => {
			for (const content of [
				'- a\n- b\n* c\n+ d',
				'1. a\n2. b\n3) c',
				'intro\n- a\n  - nested',
				'text\n> quote',
			]) {
				expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
			}
		});

		it('still breaks a continuation line inside a list item', () => {
			expect(materializeRichMessageLineBreaks('- a\ncontinued\n- b', 'markdown')).toBe(
				'- a<br>\ncontinued\n- b',
			);
		});

		it('does not touch line breaks inside an indented code block', () => {
			const content = 'before\n\n    code1\n    code2\n\nafter1\nafter2';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'before\n\n    code1\n    code2\n\nafter1<br>\nafter2',
			);
		});

		it('still breaks lines indented with a tab', () => {
			// Telegram does not read tab-indented lines as code.
			expect(materializeRichMessageLineBreaks('a\n\n\tb\n\tc', 'markdown')).toBe(
				'a\n\n\tb<br>\n\tc',
			);
		});

		it('does not touch line breaks inside inline code', () => {
			expect(materializeRichMessageLineBreaks('`a\nb`\nc', 'markdown')).toBe('`a\nb`<br>\nc');
			expect(materializeRichMessageLineBreaks('``a`\nb``', 'markdown')).toBe('``a`\nb``');
			expect(materializeRichMessageLineBreaks('x `a`\ny `b\nc` z\nw', 'markdown')).toBe(
				'x `a`<br>\ny `b\nc` z<br>\nw',
			);
		});

		it('still breaks lines after a backtick that does not open inline code', () => {
			expect(materializeRichMessageLineBreaks('it`s\na\nb', 'markdown')).toBe('it`s<br>\na<br>\nb');
			// Inline code cannot continue past an empty line.
			expect(materializeRichMessageLineBreaks('`a\nb\n\nc`', 'markdown')).toBe('`a<br>\nb\n\nc`');
			// An escaped backtick is plain text.
			expect(materializeRichMessageLineBreaks('\\`a\nb\\`\nc', 'markdown')).toBe(
				'\\`a<br>\nb\\`<br>\nc',
			);
		});

		it('reads an unmatched backtick run the same way as Telegram', () => {
			// Telegram shows one backtick as text and opens inline code with the next one.
			expect(materializeRichMessageLineBreaks('``a\nb`\nc', 'markdown')).toBe('``a\nb`<br>\nc');
		});

		it('still breaks an indented line that continues a paragraph', () => {
			// Without a blank line before it, an indented line is paragraph text, not code.
			expect(materializeRichMessageLineBreaks('text\n    more\nend', 'markdown')).toBe(
				'text<br>\n    more<br>\nend',
			);
		});

		it('does not treat indented lines as code in HTML', () => {
			expect(materializeRichMessageLineBreaks('a\n\n    b\n    c', 'html')).toBe(
				'a<br><br>\n\n    b<br>\n    c',
			);
		});

		it('turns a paragraph break into two breaks in HTML', () => {
			// Telegram collapses blank lines in HTML, the same as single line breaks.
			expect(materializeRichMessageLineBreaks('line1\nline2\n\nline3', 'html')).toBe(
				'line1<br>\nline2<br><br>\n\nline3',
			);
			expect(materializeRichMessageLineBreaks('a\n\n\n\nb', 'html')).toBe('a<br><br>\n\n\n\nb');
		});

		it('does not add paragraph breaks next to HTML block tags or at the end', () => {
			for (const content of [
				'text\n\n<ul>\n<li>a</li>\n</ul>',
				'</ul>\n\ntext',
				'a\n\n',
				'a\n\n  ',
			]) {
				expect(materializeRichMessageLineBreaks(content, 'html')).toBe(content);
			}
		});

		it('does not add paragraph breaks inside an HTML <pre> block', () => {
			const content = '<pre>code1\n\ncode2</pre>';
			expect(materializeRichMessageLineBreaks(content, 'html')).toBe(content);
		});

		it('does not touch line breaks inside a markdown table without outer pipes', () => {
			const content = 'text\nA | B\n--- | :---:\n1 | 2\n3 | 4\nmore text\nlast';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(
				'text\nA | B\n--- | :---:\n1 | 2\n3 | 4\nmore text<br>\nlast',
			);
		});

		it('does not touch line breaks inside a single-column markdown table', () => {
			const content = '| A |\n| --- |\n| 1 |';
			expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
		});

		it('still breaks a text line that contains a pipe', () => {
			expect(materializeRichMessageLineBreaks('a | b\nc', 'markdown')).toBe('a | b<br>\nc');
		});

		it('breaks lines inside one block quote', () => {
			expect(materializeRichMessageLineBreaks('> a\n> b\n>> c\n>> d', 'markdown')).toBe(
				'> a<br>\n> b\n>> c<br>\n>> d',
			);
		});

		it('does not add a break where a nested quote starts or ends', () => {
			for (const content of ['> a\n>> b', '>> a\n> b']) {
				expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
			}
		});

		it('applies the block rules to the content of a block quote', () => {
			for (const content of ['> - a\n> - b', '> # Title\n> text', '> a\n>\n> b', '> a\n> ---']) {
				expect(materializeRichMessageLineBreaks(content, 'markdown')).toBe(content);
			}
		});

		it('still breaks a continuation line after a block quote', () => {
			// Without a blank line, the next line continues the quoted paragraph.
			expect(materializeRichMessageLineBreaks('> quote\ntext', 'markdown')).toBe(
				'> quote<br>\ntext',
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
