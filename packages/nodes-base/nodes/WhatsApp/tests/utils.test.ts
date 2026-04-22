import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { SendAndWaitConfig } from '../../../utils/sendAndWait/utils';
import { createMessage, WHATSAPP_BASE_URL } from '../GenericFunctions';
import { componentsRequest, sanitizePhoneNumber, sendErrorPostReceive } from '../MessageFunctions';

describe('sanitizePhoneNumber', () => {
	const testNumber = '+99-(000)-111-2222';

	it('should remove hyphens, parentheses, and plus signs from the phone number', () => {
		expect(sanitizePhoneNumber(testNumber)).toBe('990001112222');
	});

	it('should return an empty string if input is empty', () => {
		expect(sanitizePhoneNumber('')).toBe('');
	});

	it('should return the same number if no special characters are present', () => {
		expect(sanitizePhoneNumber('990001112222')).toBe('990001112222');
	});

	it('should handle numbers with spaces correctly (not removing them)', () => {
		expect(sanitizePhoneNumber('+99 000 111 2222')).toBe('99 000 111 2222');
	});
});

describe('createMessage', () => {
	const mockSendAndWaitConfig: SendAndWaitConfig = {
		title: '',
		message: 'Please approve an option:',
		options: [
			{
				label: 'Yes',
				style: 'primary',
				url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
			},
			{
				label: 'No',
				style: 'secondary',
				url: 'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
			},
		],
	};

	const phoneID = '123456789';
	const recipientPhone = '990001112222';

	it('should return a valid HTTP request object', () => {
		const request: IHttpRequestOptions = createMessage(
			mockSendAndWaitConfig,
			phoneID,
			recipientPhone,
			'',
		);

		expect(request).toEqual({
			baseURL: WHATSAPP_BASE_URL,
			method: 'POST',
			url: `${phoneID}/messages`,
			body: {
				messaging_product: 'whatsapp',
				text: {
					body:
						'Please approve an option:\n\n' +
						'*Yes:*\n_http://localhost/waiting-webhook/nodeID?approved=true&signature=abc_\n\n' +
						'*No:*\n_http://localhost/waiting-webhook/nodeID?approved=false&signature=abc_\n\n',
				},
				type: 'text',
				to: recipientPhone,
			},
		});
	});

	it('should handle a single option correctly', () => {
		const singleOptionConfig: SendAndWaitConfig = {
			title: '',
			message: 'Choose an option:',
			options: [
				{
					label: 'Confirm',
					style: '',
					url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
				},
			],
		};

		const request: IHttpRequestOptions = createMessage(
			singleOptionConfig,
			phoneID,
			recipientPhone,
			'',
		);

		expect(request).toEqual({
			baseURL: WHATSAPP_BASE_URL,
			method: 'POST',
			url: `${phoneID}/messages`,
			body: {
				messaging_product: 'whatsapp',
				text: {
					body: 'Choose an option:\n\n*Confirm:*\n_http://localhost/waiting-webhook/nodeID?approved=true&signature=abc_\n\n',
				},
				type: 'text',
				to: recipientPhone,
			},
		});
	});
});

describe('componentsRequest', () => {
	it('maps new header and button parameter types for template components', async () => {
		const mockContext = {
			getNodeParameter: jest.fn().mockReturnValue({
				component: [
					{
						type: 'header',
						headerParameters: {
							parameter: [
								{ type: 'video', videoLink: 'https://cdn.example.com/video.mp4' },
								{ type: 'document', documentLink: 'https://cdn.example.com/doc.pdf' },
							],
						},
					},
					{
						type: 'button',
						sub_type: 'copy_code',
						index: 1,
						buttonParameters: {
							parameter: { type: 'coupon_code', coupon_code: 'SPRING26' },
						},
					},
					{
						type: 'button',
						sub_type: 'flow',
						index: 2,
						buttonParameters: {
							parameter: { type: 'action', flowToken: 'flow-token-123' },
						},
					},
				],
			}),
		} as any;

		const requestOptions: IHttpRequestOptions = { body: {} };

		const result = await componentsRequest.call(mockContext, requestOptions);

		expect(result.body).toEqual({
			template: {
				components: [
					{
						type: 'header',
						parameters: [
							{ type: 'video', video: { link: 'https://cdn.example.com/video.mp4' } },
							{ type: 'document', document: { link: 'https://cdn.example.com/doc.pdf' } },
						],
					},
					{
						type: 'button',
						sub_type: 'copy_code',
						index: '1',
						parameters: [{ type: 'coupon_code', coupon_code: 'SPRING26' }],
					},
					{
						type: 'button',
						sub_type: 'flow',
						index: '2',
						parameters: [{ type: 'action', action: { flow_token: 'flow-token-123' } }],
					},
				],
			},
		});
	});
});

describe('sendErrorPostReceive', () => {
	it('adds detailed metadata to invalid URL errors', async () => {
		const mockContext = {
			getNode: jest.fn().mockReturnValue({ name: 'WhatsApp' }),
			getNodeParameter: jest.fn((name: string, fallbackValue?: unknown) => {
				if (name === 'operation') return 'sendTemplate';
				if (name === 'messageType') return 'image';
				return fallbackValue;
			}),
		} as any;

		const response = {
			statusCode: 400,
			body: {
				error: {
					message: '(#100) image link is not a valid URI.',
					type: 'OAuthException',
					code: 100,
					fbtrace_id: 'ABC123',
				},
			},
		} as any;

		await expect(sendErrorPostReceive.call(mockContext, [], response)).rejects.toBeInstanceOf(
			NodeApiError,
		);

		try {
			await sendErrorPostReceive.call(mockContext, [], response);
		} catch (error) {
			const apiError = error as NodeApiError;
			expect(apiError.message).toContain('Invalid image URL');
			expect(apiError.description).toContain('Operation: sendTemplate');
			expect(apiError.description).toContain('Error code: 100');
			expect(apiError.description).toContain('FB trace ID: ABC123');
		}
	});
});
