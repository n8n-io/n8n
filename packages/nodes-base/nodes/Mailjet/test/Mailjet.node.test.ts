import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { Mailjet } from '../Mailjet.node';
import * as GenericFunctions from '../GenericFunctions';

describe('Mailjet Node', () => {
	let mailjetNode: Mailjet;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	const mailjetApiRequestSpy = jest.spyOn(GenericFunctions, 'mailjetApiRequest');

	beforeEach(() => {
		mailjetNode = new Mailjet();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>({
			helpers: {
				constructExecutionMetaData: jest.fn().mockImplementation((data) => data),
				returnJsonArray: jest
					.fn()
					.mockImplementation((data) =>
						Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
					),
			},
		});
		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(
			mock<INode>({
				id: 'test-mailjet-node',
				name: 'Mailjet Test',
				type: 'n8n-nodes-base.mailjet',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Email Resource - Send Operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string, _: number) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					additionalFields: {},
				};
				return params[paramName];
			});

			mailjetApiRequestSpy.mockResolvedValue({
				Messages: [
					{
						Status: 'success',
						To: [{ Email: 'recipient@example.com', MessageID: 123456789 }],
					},
				],
			});
		});

		it('should send email with customCampaign field', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						customCampaign: 'my-custom-campaign',
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							CustomCampaign: 'my-custom-campaign',
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send email with deduplicateCampaign field set to true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						deduplicateCampaign: true,
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							DeduplicateCampaign: true,
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should not include deduplicateCampaign field when set to false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						deduplicateCampaign: false,
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.not.objectContaining({
							DeduplicateCampaign: expect.anything(),
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send email with both customCampaign and deduplicateCampaign fields', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						customCampaign: 'my-campaign-2024',
						deduplicateCampaign: true,
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							CustomCampaign: 'my-campaign-2024',
							DeduplicateCampaign: true,
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send email without customCampaign and deduplicateCampaign when not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.not.objectContaining({
							CustomCampaign: expect.anything(),
							DeduplicateCampaign: expect.anything(),
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send email with other additional fields alongside customCampaign', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test HTML Body</p>',
					text: 'Test Text Body',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						fromName: 'Test Sender',
						priority: 3,
						customCampaign: 'multi-field-campaign',
						trackOpens: 'enabled',
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							From: expect.objectContaining({
								Name: 'Test Sender',
							}),
							Priority: 3,
							CustomCampaign: 'multi-field-campaign',
							TrackOpens: 'enabled',
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
		});
	});

	describe('Email Resource - Send Template Operation', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'sendTemplate',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					templateId: '12345',
					subject: 'Test Template Email',
					jsonParameters: false,
					additionalFields: {},
				};
				return params[paramName];
			});

			mailjetApiRequestSpy.mockResolvedValue({
				Messages: [
					{
						Status: 'success',
						To: [{ Email: 'recipient@example.com', MessageID: 987654321 }],
					},
				],
			});
		});

		it('should send template email with customCampaign field', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'sendTemplate',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					templateId: '12345',
					subject: 'Test Template Email',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						customCampaign: 'template-campaign',
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							TemplateID: 12345,
							CustomCampaign: 'template-campaign',
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send template email with deduplicateCampaign field set to true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'sendTemplate',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					templateId: '12345',
					subject: 'Test Template Email',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						deduplicateCampaign: true,
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							TemplateID: 12345,
							DeduplicateCampaign: true,
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send template email with customCampaign but not include deduplicateCampaign when false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'sendTemplate',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					templateId: '12345',
					subject: 'Test Template Email',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						customCampaign: 'template-campaign-v2',
						deduplicateCampaign: false,
					},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							TemplateID: 12345,
							CustomCampaign: 'template-campaign-v2',
						}),
					]),
				}),
			);
			const calls = mailjetApiRequestSpy.mock.calls;
			const lastCall = calls[calls.length - 1];
			expect(lastCall[2].Messages[0]).not.toHaveProperty('DeduplicateCampaign');
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});

		it('should send template email without customCampaign and deduplicateCampaign when not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'sendTemplate',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					templateId: '12345',
					subject: 'Test Template Email',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {},
				};
				return params[paramName];
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.not.objectContaining({
							CustomCampaign: expect.anything(),
							DeduplicateCampaign: expect.anything(),
						}),
					]),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('Multiple Items Processing', () => {
		it('should handle multiple items with different customCampaign values', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, index: number) => {
					const paramsForIndex: Array<Record<string, any>> = [
						{
							resource: 'email',
							operation: 'send',
							fromEmail: 'sender@example.com',
							toEmail: 'recipient1@example.com',
							subject: 'Test Email 1',
							html: '<p>Test 1</p>',
							text: 'Test 1',
							jsonParameters: false,
							variablesUi: { variablesValues: [] },
							additionalFields: {
								customCampaign: 'campaign-1',
								deduplicateCampaign: true,
							},
						},
						{
							resource: 'email',
							operation: 'send',
							fromEmail: 'sender@example.com',
							toEmail: 'recipient2@example.com',
							subject: 'Test Email 2',
							html: '<p>Test 2</p>',
							text: 'Test 2',
							jsonParameters: false,
							variablesUi: { variablesValues: [] },
							additionalFields: {
								customCampaign: 'campaign-2',
								deduplicateCampaign: false,
							},
						},
					];
					return paramsForIndex[index][paramName];
				},
			);

			mailjetApiRequestSpy.mockResolvedValue({
				Messages: [{ Status: 'success' }],
			});

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(mailjetApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(mailjetApiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							CustomCampaign: 'campaign-1',
							DeduplicateCampaign: true,
						}),
					]),
				}),
			);
			expect(mailjetApiRequestSpy).toHaveBeenNthCalledWith(
				2,
				'POST',
				'/v3.1/send',
				expect.objectContaining({
					Messages: expect.arrayContaining([
						expect.objectContaining({
							CustomCampaign: 'campaign-2',
						}),
					]),
				}),
			);
			const secondCall = mailjetApiRequestSpy.mock.calls[1];
			expect(secondCall[2].Messages[0]).not.toHaveProperty('DeduplicateCampaign');
			expect(result[0]).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle API errors gracefully when continueOnFail is true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test</p>',
					text: 'Test',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						customCampaign: 'error-campaign',
					},
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mailjetApiRequestSpy.mockRejectedValue(new Error('API Error'));

			const result = await mailjetNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error', 'API Error');
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'email',
					operation: 'send',
					fromEmail: 'sender@example.com',
					toEmail: 'recipient@example.com',
					subject: 'Test Email',
					html: '<p>Test</p>',
					text: 'Test',
					jsonParameters: false,
					variablesUi: { variablesValues: [] },
					additionalFields: {
						deduplicateCampaign: true,
					},
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mailjetApiRequestSpy.mockRejectedValue(new Error('API Error'));

			await expect(mailjetNode.execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		});
	});
});
