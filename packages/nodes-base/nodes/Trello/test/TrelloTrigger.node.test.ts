import { TrelloTrigger } from '../TrelloTrigger.node';

vi.mock('../TrelloTriggerHelpers', () => ({
	verifySignature: vi.fn(),
}));

import { verifySignature } from '../TrelloTriggerHelpers';

const mockedVerifySignature = vi.mocked(verifySignature);

describe('TrelloTrigger', () => {
	let trelloTrigger: TrelloTrigger;
	let mockWebhookFunctions: any;
	let mockRes: any;

	beforeEach(() => {
		vi.clearAllMocks();
		trelloTrigger = new TrelloTrigger();

		mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getWebhookName: vi.fn().mockReturnValue('default'),
			getBodyData: vi.fn().mockReturnValue({ action: { type: 'createCard' } }),
			getResponseObject: vi.fn().mockReturnValue(mockRes),
			helpers: {
				returnJsonArray: vi.fn().mockImplementation((data) => [{ json: data }]),
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
