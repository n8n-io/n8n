import type { IHttpRequestOptions } from 'n8n-workflow';

import type { SendAndWaitConfig } from '../../../utils/sendAndWait/utils';
import { createMessage, WHATSAPP_BASE_URL } from '../GenericFunctions';
import { sanitizePhoneNumber } from '../MessageFunctions';

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
