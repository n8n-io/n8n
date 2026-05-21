import { TrelloTrigger } from '../TrelloTrigger.node';

jest.mock('../TrelloTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

import { verifySignature } from '../TrelloTriggerHelpers';

const mockedVerifySignature = jest.mocked(verifySignature);

describe('TrelloTrigger', () => {
	let trelloTrigger: TrelloTrigger;
	let mockWebhookFunctions: any;
	let mockRes: any;

	beforeEach(() => {
		jest.clearAllMocks();
		trelloTrigger = new TrelloTrigger();

		mockRes = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getWebhookName: jest.fn().mockReturnValue('default'),
			getBodyData: jest.fn().mockReturnValue({ action: { type: 'createCard' } }),
			getResponseObject: jest.fn().mockReturnValue(mockRes),
			helpers: {
				returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
			},
		};
	});

	describe('webhook', () => {
		it('should respond 200 to setup HEAD request', async () => {
			mockWebhookFunctions.getWebhookName.mockReturnValue('setup');

			const result = await trelloTrigger.webhook.call(mockWebhookFunctions);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return workflow data when signature is valid', async () => {
			mockedVerifySignature.mockResolvedValue(true);

			const result = await trelloTrigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[{ json: { action: { type: 'createCard' } } }]],
			});
		});

		it('should return 401 when signature is invalid', async () => {
			mockedVerifySignature.mockResolvedValue(false);

			const result = await trelloTrigger.webhook.call(mockWebhookFunctions);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockRes.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when no secret is configured', async () => {
			mockedVerifySignature.mockResolvedValue(true);

			const result = await trelloTrigger.webhook.call(mockWebhookFunctions);

			expect(result).toHaveProperty('workflowData');
		});
	});
});
