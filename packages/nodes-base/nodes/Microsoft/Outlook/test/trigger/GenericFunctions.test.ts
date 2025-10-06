import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, INode, IPollFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { getPollResponse } from '../../trigger/GenericFunctions';

jest.mock('../../v2/helpers/utils', () => ({
	prepareFilterString: jest.fn(),
	simplifyOutputMessages: jest.fn(),
}));

jest.mock('../../v2/transport', () => ({
	downloadAttachments: jest.fn(),
	microsoftApiRequest: jest.fn(),
	microsoftApiRequestAllItems: jest.fn(),
}));

import { prepareFilterString, simplifyOutputMessages } from '../../v2/helpers/utils';
import {
	downloadAttachments,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from '../../v2/transport';

describe('Microsoft Outlook Trigger GenericFunctions', () => {
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockNode = {
			id: 'test-node',
			name: 'Test Outlook Trigger Node',
			type: 'n8n-nodes-base.microsoftOutlookTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockPollFunctions.getNode.mockReturnValue(mockNode);
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('getPollResponse', () => {
		const pollStartDate = '2023-01-01T00:00:00Z';
		const pollEndDate = '2023-01-02T00:00:00Z';
		const mockMessages = [
			{
				id: 'msg1',
				subject: 'Test Message 1',
				from: { emailAddress: { address: 'sender1@example.com' } },
				receivedDateTime: '2023-01-01T12:00:00Z',
			},
			{
				id: 'msg2',
				subject: 'Test Message 2',
				from: { emailAddress: { address: 'sender2@example.com' } },
				receivedDateTime: '2023-01-01T15:00:00Z',
			},
		];

		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation(
				(paramName: string, defaultValue?: any) => {
					const params: Record<string, any> = {
						filters: {},
						options: {},
						output: 'simple',
						fields: ['id', 'subject', 'from'],
					};
					return params[paramName] ?? defaultValue;
				},
			);

			const mockJsonArray = jest
				.fn()
				.mockImplementation((data: IDataObject[]) =>
					data.map((item, index) => ({ json: item, pairedItem: { item: index } })),
				);
			mockPollFunctions.helpers.returnJsonArray = mockJsonArray;

			(prepareFilterString as jest.Mock).mockReturnValue('');
			(simplifyOutputMessages as jest.Mock).mockReturnValue(mockMessages);
		});

		describe('successful execution', () => {
			describe('manual mode', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
				});

				it('should handle simple output format in manual mode', async () => {
					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
						$select:
							'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
						$top: 1,
					});
					expect(simplifyOutputMessages).toHaveBeenCalledWith(mockMessages);
					expect(result).toHaveLength(2);
					expect(result[0].json).toEqual(mockMessages[0]);
				});

				it('should handle fields output format in manual mode', async () => {
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: {},
								output: 'fields',
								fields: ['id', 'subject', 'from'],
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
						$select: 'id,subject,from',
						$top: 1,
					});
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(2);
				});

				it('should handle downloadAttachments option in manual mode', async () => {
					const mockExecutionData = [
						{ json: { ...mockMessages[0], attachments: ['file1.pdf'] }, pairedItem: { item: 0 } },
						{ json: { ...mockMessages[1], attachments: ['file2.doc'] }, pairedItem: { item: 1 } },
					];

					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: { downloadAttachments: true, attachmentsPrefix: 'attachment_' },
								output: 'fields',
								fields: ['id', 'subject', 'from'],
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
					(downloadAttachments as jest.Mock).mockResolvedValue(mockExecutionData);

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
						$select: 'id,subject,from,hasAttachments',
						$top: 1,
					});
					expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'attachment_');
					expect(result).toEqual(mockExecutionData);
				});
			});

			describe('trigger mode', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('trigger');
					(microsoftApiRequestAllItems as jest.Mock).mockResolvedValue(mockMessages);
				});

				it('should handle simple output format in trigger mode', async () => {
					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequestAllItems).toHaveBeenCalledWith(
						'value',
						'GET',
						'/messages',
						undefined,
						{
							$select:
								'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
							$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
						},
					);
					expect(simplifyOutputMessages).toHaveBeenCalledWith(mockMessages);
					expect(result).toHaveLength(2);
				});

				it('should handle fields output format in trigger mode', async () => {
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: {},
								output: 'fields',
								fields: ['id', 'subject', 'receivedDateTime'],
							};
							return params[paramName] ?? defaultValue;
						},
					);

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequestAllItems).toHaveBeenCalledWith(
						'value',
						'GET',
						'/messages',
						undefined,
						{
							$select: 'id,subject,receivedDateTime',
							$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
						},
					);
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(2);
				});

				it('should combine custom filters with date filters in trigger mode', async () => {
					const customFilter = 'isRead eq false';
					(prepareFilterString as jest.Mock).mockReturnValue(customFilter);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequestAllItems).toHaveBeenCalledWith(
						'value',
						'GET',
						'/messages',
						undefined,
						{
							$select:
								'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
							$filter: `${customFilter} and receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
						},
					);
				});

				it('should handle downloadAttachments option with custom prefix in trigger mode', async () => {
					const mockExecutionData = [
						{
							json: { ...mockMessages[0], attachments: ['custom_file1.pdf'] },
							pairedItem: { item: 0 },
						},
					];

					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: { downloadAttachments: true, attachmentsPrefix: 'custom_' },
								output: 'simple',
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(downloadAttachments as jest.Mock).mockResolvedValue(mockExecutionData);

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'custom_');
					expect(result).toEqual(mockExecutionData);
				});

				it('should use default attachment prefix when not specified', async () => {
					const mockExecutionData = [
						{
							json: { ...mockMessages[0], attachments: ['attachment_file1.pdf'] },
							pairedItem: { item: 0 },
						},
					];

					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: { downloadAttachments: true },
								output: 'simple',
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(downloadAttachments as jest.Mock).mockResolvedValue(mockExecutionData);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'attachment_');
				});
			});

			describe('output formats', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
				});

				it('should handle full output format', async () => {
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: {},
								output: 'full',
							};
							return params[paramName] ?? defaultValue;
						},
					);

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
						$top: 1,
					});
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(2);
				});
			});

			describe('edge cases', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
				});

				it('should handle empty response', async () => {
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: [] });
					(simplifyOutputMessages as jest.Mock).mockReturnValue([]);

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(result).toHaveLength(0);
					expect(result).toEqual([]);
				});

				it('should handle null response values', async () => {
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: null });
					const mockJsonArray = jest.fn().mockReturnValue([]);
					mockPollFunctions.helpers.returnJsonArray = mockJsonArray;

					const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(result).toHaveLength(0);
				});

				it('should include hasAttachments when downloadAttachments is enabled', async () => {
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: { downloadAttachments: true },
								output: 'fields',
								fields: ['id', 'subject'],
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
					(downloadAttachments as jest.Mock).mockResolvedValue([]);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
						$select: 'id,subject,hasAttachments',
						$top: 1,
					});
				});
			});
		});

		describe('error handling', () => {
			it('should throw NodeApiError when microsoftApiRequest fails', async () => {
				const originalError = new Error('API request failed');
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as jest.Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);

				expect(mockPollFunctions.getNode).toHaveBeenCalled();
			});

			it('should throw NodeApiError when microsoftApiRequestAllItems fails', async () => {
				const originalError = new Error('All items request failed');
				mockPollFunctions.getMode.mockReturnValue('trigger');
				(microsoftApiRequestAllItems as jest.Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);

				expect(mockPollFunctions.getNode).toHaveBeenCalled();
			});

			it('should throw NodeApiError when downloadAttachments fails', async () => {
				const originalError = new Error('Download attachments failed');
				mockPollFunctions.getMode.mockReturnValue('manual');
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						const params: Record<string, any> = {
							filters: {},
							options: { downloadAttachments: true },
							output: 'simple',
						};
						return params[paramName] ?? defaultValue;
					},
				);
				(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
				(downloadAttachments as jest.Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);
			});

			it('should throw NodeApiError when simplifyOutputMessages fails', async () => {
				const originalError = new Error('Simplify output failed');
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
				(simplifyOutputMessages as jest.Mock).mockImplementation(() => {
					throw originalError;
				});

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);
			});

			it('should throw NodeApiError when prepareFilterString fails', async () => {
				const originalError = new Error('Filter preparation failed');
				mockPollFunctions.getMode.mockReturnValue('trigger');
				(prepareFilterString as jest.Mock).mockImplementation(() => {
					throw originalError;
				});

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);
			});

			it('should preserve error message and description in NodeApiError', async () => {
				const originalError = {
					message: 'Custom error message',
					description: 'Custom error description',
				};
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as jest.Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(
					expect.objectContaining({
						message: expect.stringContaining('Custom error message'),
					}),
				);
			});

			it('should handle errors without description', async () => {
				const originalError = {
					message: 'Error without description',
				};
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as jest.Mock).mockRejectedValue(originalError);

				try {
					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);
				} catch (error) {
					expect(error).toBeInstanceOf(NodeApiError);
					expect((error as NodeApiError).message).toContain('Error without description');
				}
			});
		});

		describe('parameter validation', () => {
			beforeEach(() => {
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as jest.Mock).mockResolvedValue({ value: mockMessages });
			});

			it('should handle missing filters parameter', async () => {
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						if (paramName === 'filters') return undefined;
						const params: Record<string, any> = {
							options: {},
							output: 'simple',
						};
						return params[paramName] ?? defaultValue;
					},
				);

				const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

				expect(prepareFilterString).toHaveBeenCalledWith({ filters: undefined });
				expect(result).toHaveLength(2);
			});

			it('should handle missing options parameter', async () => {
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						if (paramName === 'options') return defaultValue || {};
						const params: Record<string, any> = {
							filters: {},
							output: 'simple',
						};
						return params[paramName] ?? defaultValue;
					},
				);

				const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

				expect(result).toHaveLength(2);
				expect(downloadAttachments).not.toHaveBeenCalled();
			});

			it('should handle missing fields parameter when output is fields', async () => {
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						if (paramName === 'fields') return [];
						const params: Record<string, any> = {
							filters: {},
							options: {},
							output: 'fields',
						};
						return params[paramName] ?? defaultValue;
					},
				);

				const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

				expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', undefined, {
					$select: '',
					$top: 1,
				});
				expect(result).toHaveLength(2);
			});
		});

		describe('integration scenarios', () => {
			it('should handle complex filter combinations', async () => {
				const complexFilter = "isRead eq false and from/emailAddress/address eq 'test@example.com'";
				mockPollFunctions.getMode.mockReturnValue('trigger');
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						const params: Record<string, any> = {
							filters: { isRead: false, fromAddress: 'test@example.com' },
							options: {},
							output: 'fields',
							fields: ['id', 'subject', 'from', 'isRead'],
						};
						return params[paramName] ?? defaultValue;
					},
				);
				(prepareFilterString as jest.Mock).mockReturnValue(complexFilter);
				(microsoftApiRequestAllItems as jest.Mock).mockResolvedValue(mockMessages);

				const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

				expect(prepareFilterString).toHaveBeenCalledWith({
					filters: { isRead: false, fromAddress: 'test@example.com' },
				});
				expect(microsoftApiRequestAllItems).toHaveBeenCalledWith(
					'value',
					'GET',
					'/messages',
					undefined,
					{
						$select: 'id,subject,from,isRead',
						$filter: `${complexFilter} and receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
					},
				);
				expect(result).toHaveLength(2);
			});

			it('should handle all options together', async () => {
				const mockExecutionData = [
					{
						json: { ...mockMessages[0], attachments: ['prefix_file1.pdf'] },
						pairedItem: { item: 0 },
					},
				];
				mockPollFunctions.getMode.mockReturnValue('trigger');
				mockPollFunctions.getNodeParameter.mockImplementation(
					(paramName: string, defaultValue?: any) => {
						const params: Record<string, any> = {
							filters: { isRead: false },
							options: { downloadAttachments: true, attachmentsPrefix: 'prefix_' },
							output: 'fields',
							fields: ['id', 'subject'],
						};
						return params[paramName] ?? defaultValue;
					},
				);
				(prepareFilterString as jest.Mock).mockReturnValue('isRead eq false');
				(microsoftApiRequestAllItems as jest.Mock).mockResolvedValue(mockMessages);
				(downloadAttachments as jest.Mock).mockResolvedValue(mockExecutionData);

				const result = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

				expect(microsoftApiRequestAllItems).toHaveBeenCalledWith(
					'value',
					'GET',
					'/messages',
					undefined,
					{
						$select: 'id,subject,hasAttachments',
						$filter: `isRead eq false and receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
					},
				);
				expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'prefix_');
				expect(result).toEqual(mockExecutionData);
			});
		});
	});
});
