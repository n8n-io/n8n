import crypto from 'crypto';
import type * as express from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IDataObject, IHookFunctions, INode, IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';
import type { WhatsAppAppWebhookSubscription, WhatsAppPageEvent } from '../types';
import { WhatsAppTrigger, filterStatuses } from '../WhatsAppTrigger.node';

describe('WhatsAppTrigger', () => {
	let node: WhatsAppTrigger;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;
	let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;
	let mockNode: jest.Mocked<INode>;

	const appWebhookSubscriptionListSpy = jest.spyOn(GenericFunctions, 'appWebhookSubscriptionList');
	const appWebhookSubscriptionCreateSpy = jest.spyOn(
		GenericFunctions,
		'appWebhookSubscriptionCreate',
	);
	const appWebhookSubscriptionDeleteSpy = jest.spyOn(
		GenericFunctions,
		'appWebhookSubscriptionDelete',
	);

	beforeEach(() => {
		node = new WhatsAppTrigger();
		mockHookFunctions = mockDeep<IHookFunctions>();
		mockWebhookFunctions = mockDeep<IWebhookFunctions>();
		mockNode = mock<INode>({
			id: 'test-node-id',
			name: 'WhatsApp Trigger',
			type: 'n8n-nodes-base.whatsAppTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('filterStatuses', () => {
		const mockEvents = [
			{ statuses: [{ status: 'sent' }] },
			{ statuses: [{ status: 'delivered' }] },
			{ statuses: [{ status: 'read' }] },
			{ statuses: [{ status: 'failed' }] },
			{},
		];

		it('should return all events when allowedStatuses is undefined', () => {
			const result = filterStatuses(mockEvents, undefined);
			expect(result).toEqual(mockEvents);
		});

		it('should return all events when allowedStatuses includes "all"', () => {
			const result = filterStatuses(mockEvents, ['all']);
			expect(result).toEqual(mockEvents);
		});

		it('should filter events with no statuses when allowedStatuses is empty', () => {
			const result = filterStatuses(mockEvents, []);
			expect(result).toEqual([{}]);
		});

		it('should filter events by specific statuses', () => {
			const result = filterStatuses(mockEvents, ['sent', 'delivered']);
			expect(result).toEqual([
				{ statuses: [{ status: 'sent' }] },
				{ statuses: [{ status: 'delivered' }] },
				{},
			]);
		});

		it('should handle events with multiple statuses', () => {
			const eventsWithMultipleStatuses = [
				{ statuses: [{ status: 'sent' }, { status: 'delivered' }] },
				{ statuses: [{ status: 'read' }] },
			];
			const result = filterStatuses(eventsWithMultipleStatuses, ['sent']);
			expect(result).toEqual([{ statuses: [{ status: 'sent' }, { status: 'delivered' }] }]);
		});
	});

	describe('Webhook Methods', () => {
		describe('checkExists', () => {
			beforeEach(() => {
				mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://test.com/webhook');
				mockHookFunctions.getCredentials.mockResolvedValue({
					clientId: 'test-app-id',
					clientSecret: 'test-secret',
				});
				mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'updates') {
						return ['messages', 'account_update'] as string[];
					}
					return undefined;
				});
				mockHookFunctions.getNode.mockReturnValue(mockNode);
			});

			it('should return false when no subscription exists', async () => {
				appWebhookSubscriptionListSpy.mockResolvedValue([]);

				const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
				expect(appWebhookSubscriptionListSpy).toHaveBeenCalledWith('test-app-id');
			});

			it('should return true when matching subscription exists', async () => {
				const mockSubscription: WhatsAppAppWebhookSubscription = {
					object: 'whatsapp_business_account',
					callback_url: 'https://test.com/webhook',
					active: true,
					fields: [
						{ name: 'account_update', version: '1.0' },
						{ name: 'messages', version: '1.0' },
					],
				};

				appWebhookSubscriptionListSpy.mockResolvedValue([mockSubscription]);

				const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(true);
			});

			it('should throw error when subscription exists with different callback URL', async () => {
				const mockSubscription: WhatsAppAppWebhookSubscription = {
					object: 'whatsapp_business_account',
					callback_url: 'https://different.com/webhook',
					active: true,
					fields: [
						{ name: 'account_update', version: '1.0' },
						{ name: 'messages', version: '1.0' },
					],
				};

				appWebhookSubscriptionListSpy.mockResolvedValue([mockSubscription]);

				await expect(
					node.webhookMethods.default.checkExists.call(mockHookFunctions),
				).rejects.toThrow(NodeOperationError);
			});

			it('should return false when subscription fields do not match subscribed events', async () => {
				const mockSubscription: WhatsAppAppWebhookSubscription = {
					object: 'whatsapp_business_account',
					callback_url: 'https://test.com/webhook',
					active: true,
					fields: [{ name: 'different_field', version: '1.0' }],
				};

				appWebhookSubscriptionListSpy.mockResolvedValue([mockSubscription]);

				const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

				expect(result).toBe(false);
				expect(appWebhookSubscriptionDeleteSpy).not.toHaveBeenCalled();
			});
		});

		describe('create', () => {
			beforeEach(() => {
				mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://test.com/webhook');
				mockHookFunctions.getCredentials.mockResolvedValue({
					clientId: 'test-app-id',
					clientSecret: 'test-secret',
				});
				mockHookFunctions.getNodeParameter.mockReturnValue(['messages', 'account_update']);
				mockHookFunctions.getNode.mockReturnValue(mockNode);
			});

			it('should create webhook subscription successfully', async () => {
				appWebhookSubscriptionCreateSpy.mockResolvedValue({ success: true });

				const result = await node.webhookMethods.default.create.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(appWebhookSubscriptionCreateSpy).toHaveBeenCalledWith('test-app-id', {
					object: 'whatsapp_business_account',
					callback_url: 'https://test.com/webhook',
					verify_token: 'test-node-id',
					fields: JSON.stringify(['messages', 'account_update']),
					include_values: true,
				});
			});
		});

		describe('delete', () => {
			beforeEach(() => {
				mockHookFunctions.getCredentials.mockResolvedValue({
					clientId: 'test-app-id',
					clientSecret: 'test-secret',
				});
			});

			it('should delete webhook subscription successfully', async () => {
				appWebhookSubscriptionDeleteSpy.mockResolvedValue({ success: true });

				const result = await node.webhookMethods.default.delete.call(mockHookFunctions);

				expect(result).toBe(true);
				expect(appWebhookSubscriptionDeleteSpy).toHaveBeenCalledWith(
					'test-app-id',
					'whatsapp_business_account',
				);
			});
		});
	});

	describe('webhook', () => {
		beforeEach(() => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				clientId: 'test-app-id',
				clientSecret: 'test-secret',
			});
			mockWebhookFunctions.getNode.mockReturnValue(mockNode);
			mockWebhookFunctions.getNodeParameter.mockReturnValue({});
		});

		describe('setup webhook (GET)', () => {
			it('should handle challenge verification successfully', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test'),
				};
				const mockResponse = {
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				} as unknown as express.Response;

				mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
				mockWebhookFunctions.getQueryData.mockReturnValue({
					'hub.challenge': 'test-challenge',
					'hub.verify_token': 'test-node-id',
				} as any);
				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockResponse.status).toHaveBeenCalledWith(200);
				expect(mockResponse.send).toHaveBeenCalledWith('test-challenge');
				expect(mockResponse.end).toHaveBeenCalled();
			});

			it('should return empty object when verify token does not match', async () => {
				mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
				mockWebhookFunctions.getQueryData.mockReturnValue({
					'hub.challenge': 'test-challenge',
					'hub.verify_token': 'wrong-token',
				} as any);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({});
			});

			it('should return empty object when no challenge is provided', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test'),
				};
				const mockBodyData = {
					object: 'whatsapp_business_account',
					entry: [],
				};

				mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
				mockWebhookFunctions.getQueryData.mockReturnValue({});
				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({});
			});
		});

		describe('default webhook (POST)', () => {
			beforeEach(() => {
				mockWebhookFunctions.getWebhookName.mockReturnValue('default');
			});

			it('should process valid webhook data successfully', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};
				const mockBodyData: WhatsAppPageEvent = {
					object: 'whatsapp_business_account',
					entry: [
						{
							id: 'entry-1',
							time: 1234567890,
							changes: [
								{
									field: 'messages',
									value: {
										statuses: [{ status: 'sent' }],
									},
								},
							],
						},
					],
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);
				mockWebhookFunctions.getNodeParameter.mockReturnValue({});

				// Mock crypto.createHmac to return predictable signature
				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				// Mock helpers.returnJsonArray
				(mockWebhookFunctions.helpers.returnJsonArray as jest.Mock).mockReturnValue([
					{ json: { statuses: [{ status: 'sent' }], field: 'messages' } },
				]);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result.workflowData).toBeDefined();
				expect(result.workflowData?.[0]).toHaveLength(1);
				expect(result.workflowData?.[0]?.[0].json).toEqual({
					statuses: [{ status: 'sent' }],
					field: 'messages',
				});
			});

			it('should return empty object when signature verification fails', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=wrong-signature',
				});

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('correct-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({});
			});

			it('should return empty object when object is not whatsapp_business_account', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};
				const mockBodyData = {
					object: 'different_object',
					entry: [],
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({});
			});

			it('should filter events based on messageStatusUpdates option', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};
				const mockBodyData: WhatsAppPageEvent = {
					object: 'whatsapp_business_account',
					entry: [
						{
							id: 'entry-1',
							time: 1234567890,
							changes: [
								{
									field: 'messages',
									value: {
										statuses: [{ status: 'sent' }],
									},
								},
								{
									field: 'messages',
									value: {
										statuses: [{ status: 'delivered' }],
									},
								},
								{
									field: 'messages',
									value: {
										statuses: [{ status: 'read' }],
									},
								},
							],
						},
					],
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);
				mockWebhookFunctions.getNodeParameter.mockReturnValue({
					messageStatusUpdates: ['sent', 'delivered'],
				});

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				// Mock helpers.returnJsonArray for filtered results
				(mockWebhookFunctions.helpers.returnJsonArray as jest.Mock).mockReturnValue([
					{ json: { statuses: [{ status: 'sent' }], field: 'messages' } },
					{ json: { statuses: [{ status: 'delivered' }], field: 'messages' } },
				]);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result.workflowData?.[0]).toHaveLength(2);
				expect((result.workflowData?.[0]?.[0]?.json?.statuses as IDataObject[])?.[0]?.status).toBe(
					'sent',
				);
				expect((result.workflowData?.[0]?.[1]?.json?.statuses as IDataObject[])?.[0]?.status).toBe(
					'delivered',
				);
			});

			it('should return empty object when no events match filters', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};
				const mockBodyData: WhatsAppPageEvent = {
					object: 'whatsapp_business_account',
					entry: [
						{
							id: 'entry-1',
							time: 1234567890,
							changes: [
								{
									field: 'messages',
									value: {
										statuses: [{ status: 'read' }],
									},
								},
							],
						},
					],
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);
				mockWebhookFunctions.getNodeParameter.mockReturnValue({
					messageStatusUpdates: ['sent', 'delivered'],
				});

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({});
			});

			it('should handle events without statuses when filtering', async () => {
				const mockRequest = {
					rawBody: Buffer.from('test-body'),
				};
				const mockBodyData: WhatsAppPageEvent = {
					object: 'whatsapp_business_account',
					entry: [
						{
							id: 'entry-1',
							time: 1234567890,
							changes: [
								{
									field: 'messages',
									value: {
										// No statuses property
									},
								},
							],
						},
					],
				};

				mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
				mockWebhookFunctions.getBodyData.mockReturnValue(mockBodyData as any);
				mockWebhookFunctions.getHeaderData.mockReturnValue({
					'x-hub-signature-256': 'sha256=test-signature',
				} as any);
				mockWebhookFunctions.getNodeParameter.mockReturnValue({
					messageStatusUpdates: ['sent'],
				});

				const createHmacSpy = jest.spyOn(crypto, 'createHmac');
				const mockHmac = {
					update: jest.fn().mockReturnThis(),
					digest: jest.fn().mockReturnValue('test-signature'),
				};
				createHmacSpy.mockReturnValue(mockHmac as unknown as ReturnType<typeof crypto.createHmac>);

				// Mock helpers.returnJsonArray for events without statuses
				(mockWebhookFunctions.helpers.returnJsonArray as jest.Mock).mockReturnValue([
					{ json: { field: 'messages' } },
				]);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result.workflowData?.[0]).toHaveLength(1);
				expect(result.workflowData?.[0]?.[0].json).toEqual({
					field: 'messages',
				});
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle API errors in webhook methods', async () => {
			mockHookFunctions.getCredentials.mockResolvedValue({
				clientId: 'test-app-id',
				clientSecret: 'test-secret',
			});
			mockHookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'updates') {
					return ['messages', 'account_update'];
				}
				return undefined;
			});
			appWebhookSubscriptionListSpy.mockRejectedValue(new Error('API Error'));

			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toThrow(
				'API Error',
			);
		});
	});
});
