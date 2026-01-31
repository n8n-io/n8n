import { TrelloTrigger } from '../TrelloTrigger.node';
import * as TrelloTriggerHelpers from '../TrelloTriggerHelpers';

describe('TrelloTrigger Node', () => {
	describe('webhook method', () => {
		let mockThis: {
			getWebhookName: jest.Mock;
			getResponseObject: jest.Mock;
			getBodyData: jest.Mock;
			helpers: {
				returnJsonArray: jest.Mock;
			};
		};
		let mockResponseObject: {
			status: jest.Mock;
			send: jest.Mock;
			end: jest.Mock;
		};

		beforeEach(() => {
			mockResponseObject = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			mockThis = {
				getWebhookName: jest.fn().mockReturnValue('default'),
				getResponseObject: jest.fn().mockReturnValue(mockResponseObject),
				getBodyData: jest.fn().mockReturnValue({
					action: { type: 'updateCard' },
					model: { id: '123' },
				}),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			};
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should respond with 200 for setup (HEAD) request', async () => {
			mockThis.getWebhookName.mockReturnValue('setup');

			const trigger = new TrelloTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponseObject.status).toHaveBeenCalledWith(200);
			expect(mockResponseObject.end).toHaveBeenCalled();
		});

		it('should reject with 401 when signature verification fails', async () => {
			jest.spyOn(TrelloTriggerHelpers, 'verifySignature').mockResolvedValueOnce(false);

			const trigger = new TrelloTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponseObject.status).toHaveBeenCalledWith(401);
			expect(mockResponseObject.send).toHaveBeenCalledWith('Unauthorized');
		});

		it('should process webhook when signature verification succeeds', async () => {
			jest.spyOn(TrelloTriggerHelpers, 'verifySignature').mockResolvedValueOnce(true);

			const trigger = new TrelloTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result).toHaveProperty('workflowData');
			expect(mockThis.helpers.returnJsonArray).toHaveBeenCalledWith({
				action: { type: 'updateCard' },
				model: { id: '123' },
			});
		});

		it('should return workflow data with the request body', async () => {
			jest.spyOn(TrelloTriggerHelpers, 'verifySignature').mockResolvedValueOnce(true);

			const trigger = new TrelloTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData).toHaveLength(1);
		});

		it('should not call getBodyData before signature is verified', async () => {
			jest.spyOn(TrelloTriggerHelpers, 'verifySignature').mockResolvedValueOnce(false);

			const trigger = new TrelloTrigger();
			await trigger.webhook.call(mockThis as never);

			expect(mockThis.getBodyData).not.toHaveBeenCalled();
		});

		it('should call getBodyData after signature is verified', async () => {
			jest.spyOn(TrelloTriggerHelpers, 'verifySignature').mockResolvedValueOnce(true);

			const trigger = new TrelloTrigger();
			await trigger.webhook.call(mockThis as never);

			expect(mockThis.getBodyData).toHaveBeenCalled();
		});
	});
});
