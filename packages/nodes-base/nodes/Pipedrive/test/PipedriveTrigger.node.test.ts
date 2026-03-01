import type { IHookFunctions } from 'n8n-workflow';

import { pipedriveApiRequest } from '../GenericFunctions';
import { PipedriveTrigger } from '../PipedriveTrigger.node';

jest.mock('basic-auth');
jest.mock('../GenericFunctions');

describe('PipedriveTrigger', () => {
	let pipedriveTrigger: PipedriveTrigger;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;

	beforeEach(() => {
		pipedriveTrigger = new PipedriveTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
		} as unknown as jest.Mocked<IHookFunctions>;
	});

	describe('Webhook Methods', () => {
		describe('checkExists', () => {
			it('should return true if webhook already exists', async () => {
				mockHookFunctions.getNodeWebhookUrl.mockReturnValue('http://test-webhook-url');
				mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
				mockHookFunctions.getNodeParameter.mockImplementation((param) => {
					if (param === 'action') return '*';
					if (param === 'entity') return 'deal';
					return null;
				});

				(pipedriveApiRequest as jest.Mock).mockResolvedValue({
					data: [
						{
							id: '123',
							subscription_url: 'http://test-webhook-url',
							event_action: '*',
							event_object: 'deal',
						},
					],
				});

				const result =
					await pipedriveTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(mockHookFunctions.getWorkflowStaticData('node').webhookId).toBe('123');
			});

			it('should return false if no matching webhook exists', async () => {
				mockHookFunctions.getNodeWebhookUrl.mockReturnValue('http://test-webhook-url');
				mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
				mockHookFunctions.getNodeParameter.mockImplementation((param) => {
					if (param === 'action') return '*';
					if (param === 'entity') return 'deal';
					return null;
				});

				(pipedriveApiRequest as jest.Mock).mockResolvedValue({
					data: [
						{
							subscription_url: 'http://different-url',
							event_action: 'create',
							event_object: 'person',
						},
					],
				});

				const result =
					await pipedriveTrigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
			});
		});

		describe('create', () => {
			it('should create a webhook successfully', async () => {
				mockHookFunctions.getNodeWebhookUrl.mockReturnValue('http://test-webhook-url');
				mockHookFunctions.getNodeParameter.mockImplementation((param) => {
					if (param === 'incomingAuthentication') return 'none';
					if (param === 'action') return '*';
					if (param === 'entity') return 'deal';
					return null;
				});
				mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

				(pipedriveApiRequest as jest.Mock).mockResolvedValue({
					data: { id: '123' },
				});

				const result = await pipedriveTrigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(pipedriveApiRequest).toHaveBeenCalledWith(
					'POST',
					'/webhooks',
					expect.objectContaining({
						event_action: '*',
						event_object: 'deal',
						subscription_url: 'http://test-webhook-url',
					}),
				);
			});
		});
	});
});
