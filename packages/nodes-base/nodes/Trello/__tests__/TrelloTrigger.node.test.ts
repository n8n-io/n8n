import type { IWebhookFunctions } from 'n8n-workflow';

import { TrelloTrigger } from '../TrelloTrigger.node';
import { verifySignature } from '../TrelloTriggerHelpers';

jest.mock('../TrelloTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

const mockedVerifySignature = jest.mocked(verifySignature);

describe('TrelloTrigger Node', () => {
	let node: TrelloTrigger;

	beforeEach(() => {
		node = new TrelloTrigger();
		jest.clearAllMocks();
	});

	describe('webhook', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const testBody = {
			action: { type: 'createCard', id: 'action123' },
			model: { id: 'board123', name: 'Test Board' },
		};

		beforeEach(() => {
			mockWebhookFunctions = {
				getWebhookName: jest.fn().mockReturnValue('default'),
				getBodyData: jest.fn().mockReturnValue(testBody),
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			} as unknown as IWebhookFunctions;

			mockedVerifySignature.mockResolvedValue(true);
		});

		it('should respond with 200 for setup webhook (HEAD request)', async () => {
			(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('setup');

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockWebhookFunctions.getResponseObject).toHaveBeenCalled();
			const res = (mockWebhookFunctions.getResponseObject as jest.Mock).mock.results[0].value;
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.end).toHaveBeenCalled();
			expect(mockedVerifySignature).not.toHaveBeenCalled();
		});

		it('should process webhook with valid signature', async () => {
			mockedVerifySignature.mockResolvedValue(true);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
			expect(mockedVerifySignature).toHaveBeenCalled();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(testBody);
		});

		it('should reject webhook with invalid signature and return 401', async () => {
			mockedVerifySignature.mockResolvedValue(false);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockedVerifySignature).toHaveBeenCalled();
			const res = (mockWebhookFunctions.getResponseObject as jest.Mock).mock.results[0].value;
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith('Unauthorized');
		});

		it('should not call verifySignature for setup webhook', async () => {
			(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('setup');

			await node.webhook.call(mockWebhookFunctions);

			expect(mockedVerifySignature).not.toHaveBeenCalled();
		});
	});
});
