import type { IWebhookFunctions } from 'n8n-workflow';

import { TwilioTrigger } from '../TwilioTrigger.node';
import { verifySignature } from '../TwilioTriggerHelpers';

jest.mock('../TwilioTriggerHelpers');

describe('TwilioTrigger', () => {
	let trigger: TwilioTrigger;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		'getBodyData' | 'getResponseObject' | 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new TwilioTrigger();

		mockWebhookFunctions = {
			getBodyData: jest.fn(),
			getResponseObject: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as any,
		};
	});

	describe('webhook', () => {
		it('should process the webhook when signature verification passes', async () => {
			const bodyData = [
				{ specversion: '1.0', type: 'com.twilio.messaging.inbound-message.received' },
			];

			(verifySignature as jest.Mock).mockResolvedValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(bodyData);
		});

		it('should return 401 when signature verification fails', async () => {
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			(verifySignature as jest.Mock).mockResolvedValue(false);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockWebhookFunctions.getBodyData).not.toHaveBeenCalled();
		});

		it('should process the webhook when no auth token is configured (backward compat)', async () => {
			const bodyData = [
				{ specversion: '1.0', type: 'com.twilio.voice.insights.call-summary.complete' },
			];

			(verifySignature as jest.Mock).mockResolvedValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(result.workflowData).toBeDefined();
		});
	});
});
