import { createHash } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	INode,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { HubspotTrigger } from '../HubspotTrigger.node';
import * as GenericFunctions from '../V1/GenericFunctions';

jest.mock('../V1/GenericFunctions', () => ({
	hubspotApiRequest: jest.fn(),
	propertyEvents: [
		'contact.propertyChange',
		'company.propertyChange',
		'deal.propertyChange',
		'ticket.propertyChange',
	],
}));

const mockedHubspotApiRequest = jest.mocked(GenericFunctions.hubspotApiRequest);

describe('HubspotTrigger', () => {
	let trigger: HubspotTrigger;
	let mockHookFunctions: IHookFunctions;
	let mockWebhookFunctions: IWebhookFunctions;
	let mockLoadOptionsFunctions: ILoadOptionsFunctions;
	let mockNode: INode;

	beforeEach(() => {
		trigger = new HubspotTrigger();
		mockNode = {
			id: 'test-node',
			name: 'HubSpot Trigger',
			type: 'n8n-nodes-base.hubspotTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn().mockReturnValue('https://test.com/webhook'),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getNode: jest.fn().mockReturnValue(mockNode),
			getWebhookName: jest.fn().mockReturnValue('default'),
			getContext: jest.fn(),
			getActivationMode: jest.fn(),
			getMode: jest.fn(),
			getNodeExecutionData: jest.fn(),
			getRestApiUrl: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {} as any,
		} as unknown as IHookFunctions;

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getHeaderData: jest.fn(),
			getBodyData: jest.fn(),
			getCredentials: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getWebhookName: jest.fn().mockReturnValue('default'),
			getContext: jest.fn(),
			getActivationMode: jest.fn(),
			getMode: jest.fn(),
			getNodeExecutionData: jest.fn(),
			getRestApiUrl: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {
				returnJsonArray: jest
					.fn()
					.mockImplementation((data) => data.map((item: any) => ({ json: item }))),
			} as any,
		} as unknown as IWebhookFunctions;

		mockLoadOptionsFunctions = {
			getCredentials: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getWebhookName: jest.fn().mockReturnValue('default'),
			getContext: jest.fn(),
			getActivationMode: jest.fn(),
			getMode: jest.fn(),
			getNodeExecutionData: jest.fn(),
			getRestApiUrl: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {} as any,
		} as unknown as ILoadOptionsFunctions;

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct node description', () => {
			expect(trigger.description.displayName).toBe('HubSpot Trigger');
			expect(trigger.description.name).toBe('hubspotTrigger');
			expect(trigger.description.group).toEqual(['trigger']);
			expect(trigger.description.version).toBe(1);
			expect(trigger.description.inputs).toEqual([]);
			expect(trigger.description.outputs).toHaveLength(1);
		});

		it('should have required credentials', () => {
			expect(trigger.description.credentials).toEqual([
				{
					name: 'hubspotDeveloperApi',
					required: true,
				},
			]);
		});

		it('should have webhook configuration', () => {
			expect(trigger.description.webhooks).toEqual([
				{
					name: 'default',
					httpMethod: 'POST',
					responseMode: 'onReceived',
					path: 'webhook',
				},
				{
					name: 'setup',
					httpMethod: 'GET',
					responseMode: 'onReceived',
					path: 'webhook',
				},
			]);
		});
	});

	describe('Load Options Methods', () => {
		beforeEach(() => {
			(mockLoadOptionsFunctions.getCredentials as jest.Mock).mockResolvedValue({
				appId: 'test-app-id',
				clientSecret: 'test-client-secret',
			});
		});

		describe('getContactProperties', () => {
			it('should load contact properties successfully', async () => {
				const mockProperties = [
					{ label: 'First Name', name: 'firstname' },
					{ label: 'Last Name', name: 'lastname' },
					{ label: 'Email', name: 'email' },
				];

				mockedHubspotApiRequest.mockResolvedValue(mockProperties);

				const result =
					await trigger.methods.loadOptions.getContactProperties.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'First Name', value: 'firstname' },
					{ name: 'Last Name', value: 'lastname' },
					{ name: 'Email', value: 'email' },
				]);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'GET',
					'/properties/v2/contacts/properties',
					{},
				);
			});

			it('should handle empty properties response', async () => {
				mockedHubspotApiRequest.mockResolvedValue([]);

				const result =
					await trigger.methods.loadOptions.getContactProperties.call(mockLoadOptionsFunctions);

				expect(result).toEqual([]);
			});

			it('should handle API errors', async () => {
				mockedHubspotApiRequest.mockRejectedValue(new Error('API Error'));

				await expect(
					trigger.methods.loadOptions.getContactProperties.call(mockLoadOptionsFunctions),
				).rejects.toThrow('API Error');
			});
		});

		describe('getCompanyProperties', () => {
			it('should load company properties successfully', async () => {
				const mockProperties = [
					{ label: 'Company Name', name: 'name' },
					{ label: 'Industry', name: 'industry' },
				];

				mockedHubspotApiRequest.mockResolvedValue(mockProperties);

				const result =
					await trigger.methods.loadOptions.getCompanyProperties.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Company Name', value: 'name' },
					{ name: 'Industry', value: 'industry' },
				]);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'GET',
					'/properties/v2/companies/properties',
					{},
				);
			});
		});

		describe('getDealProperties', () => {
			it('should load deal properties successfully', async () => {
				const mockProperties = [
					{ label: 'Deal Name', name: 'dealname' },
					{ label: 'Amount', name: 'amount' },
				];

				mockedHubspotApiRequest.mockResolvedValue(mockProperties);

				const result =
					await trigger.methods.loadOptions.getDealProperties.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Deal Name', value: 'dealname' },
					{ name: 'Amount', value: 'amount' },
				]);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'GET',
					'/properties/v2/deals/properties',
					{},
				);
			});
		});

		describe('getTicketProperties', () => {
			it('should load ticket properties successfully', async () => {
				const mockProperties = [
					{ label: 'Subject', name: 'subject' },
					{ label: 'Priority', name: 'priority' },
				];

				mockedHubspotApiRequest.mockResolvedValue(mockProperties);

				const result =
					await trigger.methods.loadOptions.getTicketProperties.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Subject', value: 'subject' },
					{ name: 'Priority', value: 'priority' },
				]);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'GET',
					'/properties/v2/tickets/properties',
					{},
				);
			});
		});
	});

	describe('Webhook Methods', () => {
		beforeEach(() => {
			(mockHookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				appId: 'test-app-id',
				clientSecret: 'test-client-secret',
			});
		});

		describe('checkExists', () => {
			it('should return false when webhook does not exist', async () => {
				mockedHubspotApiRequest.mockRejectedValue({ statusCode: 404 });

				const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
			});

			it('should throw error when different target URL exists', async () => {
				mockedHubspotApiRequest.mockResolvedValue({
					targetUrl: 'https://different-url.com/webhook',
				});

				await expect(
					trigger.webhookMethods.default.checkExists.call(mockHookFunctions),
				).rejects.toThrow();
			});

			it('should delete existing webhook and return false when same URL exists', async () => {
				const mockSubscriptions = [{ id: 'sub1' }, { id: 'sub2' }];

				mockedHubspotApiRequest
					.mockResolvedValueOnce({ targetUrl: 'https://test.com/webhook' })
					.mockResolvedValueOnce({ results: mockSubscriptions })
					.mockResolvedValue(undefined);

				const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/subscriptions/sub1',
					{},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/subscriptions/sub2',
					{},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/settings',
					{},
				);
			});

			it('should handle API errors during check', async () => {
				mockedHubspotApiRequest.mockRejectedValue(new Error('Network error'));

				await expect(
					trigger.webhookMethods.default.checkExists.call(mockHookFunctions),
				).rejects.toThrow('Network error');
			});
		});

		describe('create', () => {
			beforeEach(() => {
				(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(paramName: string) => {
						const mockParams: IDataObject = {
							eventsUi: {
								eventValues: [
									{ name: 'contact.creation' },
									{ name: 'contact.propertyChange', property: 'email' },
								],
							},
							additionalFields: {
								maxConcurrentRequests: 10,
							},
						};
						return mockParams[paramName];
					},
				);
			});

			it('should create webhook successfully', async () => {
				mockedHubspotApiRequest.mockResolvedValue(undefined);

				const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/webhooks/v3/test-app-id/settings',
					{
						targetUrl: 'https://test.com/webhook',
						maxConcurrentRequests: 10,
					},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'POST',
					'/webhooks/v3/test-app-id/subscriptions',
					{
						eventType: 'contact.creation',
						active: true,
					},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'POST',
					'/webhooks/v3/test-app-id/subscriptions',
					{
						eventType: 'contact.propertyChange',
						active: true,
						propertyName: 'email',
					},
				);
			});

			it('should use default maxConcurrentRequests when not provided', async () => {
				(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(paramName: string) => {
						const mockParams: IDataObject = {
							eventsUi: {
								eventValues: [{ name: 'contact.creation' }],
							},
							additionalFields: {},
						};
						return mockParams[paramName];
					},
				);

				mockedHubspotApiRequest.mockResolvedValue(undefined);

				await trigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/webhooks/v3/test-app-id/settings',
					{
						targetUrl: 'https://test.com/webhook',
						maxConcurrentRequests: 5,
					},
				);
			});

			it('should throw error when no events are defined', async () => {
				(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(paramName: string) => {
						const mockParams: IDataObject = {
							eventsUi: { eventValues: [] },
							additionalFields: {},
						};
						return mockParams[paramName];
					},
				);

				await expect(trigger.webhookMethods.default.create.call(mockHookFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});

			it('should handle property events correctly', async () => {
				(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(paramName: string) => {
						const mockParams: IDataObject = {
							eventsUi: {
								eventValues: [
									{ name: 'ticket.propertyChange', property: 'priority' },
									{ name: 'deal.propertyChange', property: 'amount' },
								],
							},
							additionalFields: {},
						};
						return mockParams[paramName];
					},
				);

				mockedHubspotApiRequest.mockResolvedValue(undefined);

				await trigger.webhookMethods.default.create.call(mockHookFunctions);

				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'POST',
					'/webhooks/v3/test-app-id/subscriptions',
					{
						eventType: 'ticket.propertyChange',
						active: true,
						propertyName: 'priority',
					},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'POST',
					'/webhooks/v3/test-app-id/subscriptions',
					{
						eventType: 'deal.propertyChange',
						active: true,
						propertyName: 'amount',
					},
				);
			});
		});

		describe('delete', () => {
			it('should delete webhook successfully', async () => {
				const mockSubscriptions = [{ id: 'sub1' }, { id: 'sub2' }];

				mockedHubspotApiRequest
					.mockResolvedValueOnce({ results: mockSubscriptions })
					.mockResolvedValue(undefined);

				const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'GET',
					'/webhooks/v3/test-app-id/subscriptions',
					{},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/subscriptions/sub1',
					{},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/subscriptions/sub2',
					{},
				);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/settings',
					{},
				);
			});

			it('should return false when settings deletion fails', async () => {
				mockedHubspotApiRequest
					.mockResolvedValueOnce({ results: [] })
					.mockRejectedValueOnce(new Error('Settings deletion failed'));

				const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(result).toBe(false);
			});

			it('should handle empty subscriptions', async () => {
				mockedHubspotApiRequest
					.mockResolvedValueOnce({ results: [] })
					.mockResolvedValueOnce(undefined);

				const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/webhooks/v3/test-app-id/settings',
					{},
				);
			});
		});
	});

	describe('Webhook Execution', () => {
		beforeEach(() => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				appId: 'test-app-id',
				clientSecret: 'test-client-secret',
			});
		});

		it('should process webhook data successfully', async () => {
			const mockBodyData = [
				{
					subscriptionType: 'contact.creation',
					objectId: '12345',
					propertyName: 'email',
					propertyValue: 'test@example.com',
				},
				{
					subscriptionType: 'company.creation',
					objectId: '67890',
					propertyName: 'name',
					propertyValue: 'Test Company',
				},
			];

			const hash = `test-client-secret${JSON.stringify(mockBodyData)}`;
			const signature = createHash('sha256').update(hash).digest('hex');

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': signature,
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData[0][0].json).toEqual({
				subscriptionType: 'contact.creation',
				contactId: '12345',
				propertyName: 'email',
				propertyValue: 'test@example.com',
			});
			expect(result.workflowData[0][1].json).toEqual({
				subscriptionType: 'company.creation',
				companyId: '67890',
				propertyName: 'name',
				propertyValue: 'Test Company',
			});
		});

		it('should handle deal and ticket events', async () => {
			const mockBodyData = [
				{
					subscriptionType: 'deal.creation',
					objectId: 'deal123',
				},
				{
					subscriptionType: 'ticket.propertyChange',
					objectId: 'ticket456',
					propertyName: 'priority',
					propertyValue: 'high',
				},
			];

			const hash = `test-client-secret${JSON.stringify(mockBodyData)}`;
			const signature = createHash('sha256').update(hash).digest('hex');

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': signature,
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result.workflowData[0][0].json).toEqual({
				subscriptionType: 'deal.creation',
				dealId: 'deal123',
			});
			expect(result.workflowData[0][1].json).toEqual({
				subscriptionType: 'ticket.propertyChange',
				ticketId: 'ticket456',
				propertyName: 'priority',
				propertyValue: 'high',
			});
		});

		it('should return empty object when no credentials found', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue(undefined);

			await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toThrow();
		});

		it('should return empty object when signature is missing', async () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: [{ subscriptionType: 'contact.creation', objectId: '123' }],
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should return empty object when signature is invalid', async () => {
			const mockBodyData = [{ subscriptionType: 'contact.creation', objectId: '123' }];

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': 'invalid-signature',
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should handle empty body data', async () => {
			const mockBodyData: any[] = [];
			const hash = `test-client-secret${JSON.stringify(mockBodyData)}`;
			const signature = createHash('sha256').update(hash).digest('hex');

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': signature,
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData[0]).toEqual([]);
		});

		it('should handle unknown subscription types', async () => {
			const mockBodyData = [
				{
					subscriptionType: 'unknown.event',
					objectId: '12345',
				},
			];

			const hash = `test-client-secret${JSON.stringify(mockBodyData)}`;
			const signature = createHash('sha256').update(hash).digest('hex');

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': signature,
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result.workflowData[0][0].json).toEqual({
				subscriptionType: 'unknown.event',
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle credential errors in load options', async () => {
			(mockLoadOptionsFunctions.getCredentials as jest.Mock).mockRejectedValue(
				new Error('Invalid credentials'),
			);

			await expect(
				trigger.methods.loadOptions.getContactProperties.call(mockLoadOptionsFunctions),
			).rejects.toThrow();
		});

		it('should handle network errors in webhook creation', async () => {
			(mockHookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				appId: 'test-app-id',
				clientSecret: 'test-client-secret',
			});
			(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				const mockParams: IDataObject = {
					eventsUi: {
						eventValues: [{ name: 'contact.creation' }],
					},
					additionalFields: {},
				};
				return mockParams[paramName];
			});

			mockedHubspotApiRequest.mockRejectedValue(new Error('Network timeout'));

			await expect(trigger.webhookMethods.default.create.call(mockHookFunctions)).rejects.toThrow(
				'Network timeout',
			);
		});

		it('should handle malformed webhook data', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				appId: 'test-app-id',
				clientSecret: 'test-client-secret',
			});

			const mockBodyData = [
				{
					subscriptionType: 'contact.creation',
					// Missing objectId
				},
			];

			const hash = `test-client-secret${JSON.stringify(mockBodyData)}`;
			const signature = createHash('sha256').update(hash).digest('hex');

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: mockBodyData,
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-hubspot-signature': signature,
			});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result.workflowData[0][0].json).toEqual({
				subscriptionType: 'contact.creation',
				contactId: undefined,
			});
		});
	});
});
