import type { IWebhookFunctions } from 'n8n-workflow';

import { TaigaTrigger } from '../TaigaTrigger.node';
import { verifySignature } from '../TaigaTriggerHelpers';

jest.mock('../TaigaTriggerHelpers');

describe('TaigaTrigger', () => {
	let trigger: TaigaTrigger;
	let mockResponse: { status: jest.Mock; send: jest.Mock; end: jest.Mock };
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		| 'getNodeParameter'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new TaigaTrigger();

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn(),
		};

		mockWebhookFunctions = {
			getNodeParameter: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => [{ json: data }]),
			} as any,
		};
	});

	describe('webhook', () => {
		it('should return 401 when signature verification fails', async () => {
			(verifySignature as jest.Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should process webhook when signature verification passes', async () => {
			const body = { action: 'create', type: 'issue', data: { id: 1 } };

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operations') return ['all'];
				if (name === 'resources') return ['all'];
				return null;
			});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(body);
		});

		it('should process webhook when no key is stored (backward compatibility)', async () => {
			const body = { action: 'change', type: 'task', data: { id: 2 } };

			// helper returns true when key is missing — simulate by returning true
			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operations') return ['all'];
				if (name === 'resources') return ['all'];
				return null;
			});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});
});
