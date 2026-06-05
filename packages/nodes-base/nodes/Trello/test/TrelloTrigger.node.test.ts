import { TrelloTrigger } from '../TrelloTrigger.node';

jest.mock('../TrelloTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

jest.mock('../GenericFunctions', () => ({
	apiRequest: jest.fn(),
}));

import { apiRequest } from '../GenericFunctions';
import { verifySignature } from '../TrelloTriggerHelpers';

const mockedVerifySignature = jest.mocked(verifySignature);
const mockedApiRequest = jest.mocked(apiRequest);

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

	describe('webhookMethods.checkExists (OAuth1)', () => {
		const idModel = '4d5ea62fd76aa1136000000c';
		const webhookUrl = 'https://n8n.example.com/webhook/trello';

		let mockHookFunctions: any;
		let staticData: { webhookId?: string };

		beforeEach(() => {
			staticData = { webhookId: 'existing-webhook-id' };

			mockHookFunctions = {
				getNodeParameter: jest.fn((name: string) => {
					if (name === 'authentication') return 'oAuth1';
					if (name === 'id') return idModel;
					return undefined;
				}),
				getNodeWebhookUrl: jest.fn().mockReturnValue(webhookUrl),
				getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
			};
		});

		it('should return true when the stored webhook matches idModel and callbackURL', async () => {
			mockedApiRequest.mockResolvedValue({
				id: 'existing-webhook-id',
				idModel,
				callbackURL: webhookUrl,
			});

			const result = await trelloTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(mockedApiRequest).toHaveBeenCalledTimes(1);
			expect(mockedApiRequest).toHaveBeenCalledWith('GET', 'webhooks/existing-webhook-id', {});
			expect(staticData.webhookId).toBe('existing-webhook-id');
		});

		it('should delete the stale webhook and return false when config no longer matches', async () => {
			mockedApiRequest
				.mockResolvedValueOnce({
					id: 'existing-webhook-id',
					idModel: 'a-different-model',
					callbackURL: 'https://old.example.com/webhook/trello',
				})
				.mockResolvedValueOnce(undefined);

			const result = await trelloTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(mockedApiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'webhooks/existing-webhook-id',
				{},
			);
			expect(mockedApiRequest).toHaveBeenNthCalledWith(
				2,
				'DELETE',
				'webhooks/existing-webhook-id',
				{},
			);
			expect(staticData.webhookId).toBeUndefined();
		});

		it('should return false and clear the stored webhookId when the lookup throws', async () => {
			mockedApiRequest.mockRejectedValue(new Error('404 Not Found'));

			const result = await trelloTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(staticData.webhookId).toBeUndefined();
		});

		it('should return false without calling the API when no webhookId is stored', async () => {
			delete staticData.webhookId;

			const result = await trelloTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(mockedApiRequest).not.toHaveBeenCalled();
		});
	});
});
