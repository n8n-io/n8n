import type { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import * as sendAndWaitUtils from '@utils/sendAndWait/utils';

import { webhook } from '../../../actions/webhook';

describe('webhook', () => {
	const mockSend = jest.fn();
	const sendAndWaitWebhookSpy = jest.spyOn(sendAndWaitUtils, 'sendAndWaitWebhook');
	const getMockWebhookFunctions = (
		headers: Record<string, string>,
		responseType: 'approval' | 'freeText' | 'customForm',
	) => {
		const mockWebhookFunctions = mockDeep<IWebhookFunctions>();
		mockWebhookFunctions.getRequestObject.mockReturnValue({
			headers,
		} as unknown as Request);
		mockWebhookFunctions.getResponseObject.mockReturnValue({
			send: mockSend,
		} as unknown as Response);
		mockWebhookFunctions.getNodeParameter.mockImplementation(
			(parameterName: string, fallbackValue?: any) => {
				const params: { [key: string]: any } = {
					responseType,
				};
				return params[parameterName] ?? fallbackValue;
			},
		);
		return mockWebhookFunctions;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return noWebhookResponse if user-agent is empty', async () => {
		const mockWebhookFunctions = getMockWebhookFunctions({}, 'approval');

		const result = await webhook.call(mockWebhookFunctions);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(sendAndWaitWebhookSpy).not.toHaveBeenCalled();
		expect(mockSend).toHaveBeenCalledWith('');
	});

	it.each([
		[
			'SkypeSpaces/1.0',
			'Microsoft Teams/1.0',
			'SkypeUriPreview Preview/1.0',
			'Preview Service/1.0',
		],
	])(
		'should return noWebhookResponse if user-agent has string that contains %s',
		async (userAgent) => {
			const mockWebhookFunctions = getMockWebhookFunctions({ 'user-agent': userAgent }, 'approval');

			const result = await webhook.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(sendAndWaitWebhookSpy).not.toHaveBeenCalled();
			expect(mockSend).toHaveBeenCalledWith('');
		},
	);

	it('should call sendAndWaitWebhook if user-agent is not Microsoft Teams link preview service', async () => {
		const mockWebhookFunctions = getMockWebhookFunctions(
			{
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			},
			'approval',
		);
		sendAndWaitWebhookSpy.mockResolvedValue({
			webhookResponse: 'test',
			workflowData: [[{ json: { data: { text: 'test' } } }]],
		});

		const result = await webhook.call(mockWebhookFunctions);

		expect(result).toEqual({
			webhookResponse: 'test',
			workflowData: [[{ json: { data: { text: 'test' } } }]],
		});
		expect(sendAndWaitWebhookSpy).toHaveBeenCalled();
		expect(mockSend).not.toHaveBeenCalled();
	});

	it.each([
		['freeText' as const, ''],
		['freeText' as const, 'SkypeUriPreview Preview/1.0'],
		['freeText' as const, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
		['customForm' as const, ''],
		['customForm' as const, 'SkypeUriPreview Preview/1.0'],
		['customForm' as const, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
	])(
		'should call sendAndWaitWebhook if responseType is regardless of user-agent',
		async (responseType, userAgent) => {
			const mockWebhookFunctions = getMockWebhookFunctions(
				{ 'user-agent': userAgent },
				responseType,
			);
			sendAndWaitWebhookSpy.mockResolvedValue({
				webhookResponse: 'test',
				workflowData: [[{ json: { data: { text: 'test' } } }]],
			});

			const result = await webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				webhookResponse: 'test',
				workflowData: [[{ json: { data: { text: 'test' } } }]],
			});
			expect(sendAndWaitWebhookSpy).toHaveBeenCalled();
		},
	);
});
