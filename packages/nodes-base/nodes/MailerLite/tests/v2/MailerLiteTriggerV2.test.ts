import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { MailerLiteTriggerV2 } from '../../v2/MailerLiteTriggerV2.node';

jest.mock('../../v2/MailerLiteTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

import { verifySignature } from '../../v2/MailerLiteTriggerHelpers';

describe('MailerLiteTriggerV2', () => {
	let trigger: MailerLiteTriggerV2;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: jest.Mock; send: jest.Mock; end: jest.Mock };

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new MailerLiteTriggerV2({
			displayName: 'MailerLite Trigger',
			name: 'mailerLiteTrigger',
			icon: 'file:MailerLite.svg',
			group: ['trigger'],
			description: 'Starts the workflow when MailerLite events occur',
			defaultVersion: 2,
		});

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: jest.fn(),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifySignature as jest.Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should trigger workflow when signature is valid', async () => {
			const fields: IDataObject[] = [{ id: '1', name: 'subscriber.created' }];
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({ fields });

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith(fields);
		});

		it('should return 401 when signature verification fails', async () => {
			(verifySignature as jest.Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when no secret is configured (backward compatibility)', async () => {
			// verifySignature returns true when no secret is configured
			(verifySignature as jest.Mock).mockReturnValue(true);
			const fields: IDataObject[] = [{ id: '1' }];
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({ fields });

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});
});
