import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, INode, IPollFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { getPollResponse } from '../../trigger/GenericFunctions';

vi.mock('../../v2/helpers/utils', () => ({
	prepareFilterString: vi.fn(),
	simplifyOutputMessages: vi.fn(),
}));

vi.mock('../../v2/transport', () => ({
	downloadAttachments: vi.fn(),
	microsoftApiRequest: vi.fn(),
}));

import { prepareFilterString, simplifyOutputMessages } from '../../v2/helpers/utils';
import { downloadAttachments, microsoftApiRequest } from '../../v2/transport';
import type { Mock, Mocked } from 'vitest';

describe('Microsoft Outlook Trigger GenericFunctions', () => {
	let mockPollFunctions: Mocked<IPollFunctions>;
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
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
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

			const mockJsonArray = vi
				.fn()
				.mockImplementation((data: IDataObject[]) =>
					data.map((item, index) => ({ json: item, pairedItem: { item: index } })),
				);
			mockPollFunctions.helpers.returnJsonArray = mockJsonArray;

			(prepareFilterString as Mock).mockReturnValue('');
			(simplifyOutputMessages as Mock).mockReturnValue(mockMessages);
		});

		describe('successful execution', () => {
			describe('manual mode', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
				});

				it('should handle simple output format in manual mode', async () => {
					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select:
							'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
						$top: 1,
						$orderby: 'receivedDateTime desc',
					});
					expect(simplifyOutputMessages).toHaveBeenCalledWith([mockMessages[0]]);
					expect(result).toHaveLength(2);
					expect(result[0].json).toEqual(mockMessages[0]);
				});

				it('should prepend a receivedDateTime clause to user filters in manual mode', async () => {
					const customFilter = 'isRead eq false';
					(prepareFilterString as Mock).mockReturnValue(customFilter);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select:
							'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
						$top: 1,
						$orderby: 'receivedDateTime desc',
						$filter: `receivedDateTime ge 1900-01-01T00:00:00Z and (${customFilter})`,
					});
				});

				it('should wrap user filters in parentheses so or does not mix with the date clause', async () => {
					const customFilter = "isRead eq false or from/emailAddress/address eq 'test@example.com'";
					(prepareFilterString as Mock).mockReturnValue(customFilter);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select:
							'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
						$top: 1,
						$orderby: 'receivedDateTime desc',
						$filter: `receivedDateTime ge 1900-01-01T00:00:00Z and (${customFilter})`,
					});
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
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select: 'id,subject,from',
						$top: 1,
						$orderby: 'receivedDateTime desc',
					});
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(1);
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
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
					(downloadAttachments as Mock).mockResolvedValue(mockExecutionData);

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select: 'id,subject,from,hasAttachments',
						$top: 1,
						$orderby: 'receivedDateTime desc',
					});
					expect(downloadAttachments).toHaveBeenCalledWith([mockMessages[0]], 'attachment_', 0);
					expect(result).toEqual(mockExecutionData);
				});
			});

			describe('trigger mode', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('trigger');
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
				});

				it('should handle simple output format in trigger mode', async () => {
					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith(
						'GET',
						'/messages',
						0,
						undefined,
						{
							$select:
								'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments,receivedDateTime',
							$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
							$top: 100,
							$orderby: 'receivedDateTime asc',
						},
						undefined,
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

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith(
						'GET',
						'/messages',
						0,
						undefined,
						{
							$select: 'id,subject,receivedDateTime',
							$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
							$top: 100,
							$orderby: 'receivedDateTime asc',
						},
						undefined,
					);
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(2);
				});

				it('should combine custom filters with date filters in trigger mode', async () => {
					const customFilter = 'isRead eq false';
					(prepareFilterString as Mock).mockReturnValue(customFilter);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith(
						'GET',
						'/messages',
						0,
						undefined,
						{
							$select:
								'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments,receivedDateTime',
							$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate} and (${customFilter})`,
							$top: 100,
							$orderby: 'receivedDateTime asc',
						},
						undefined,
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
					(downloadAttachments as Mock).mockResolvedValue(mockExecutionData);

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'custom_', 0);
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
					(downloadAttachments as Mock).mockResolvedValue(mockExecutionData);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(downloadAttachments).toHaveBeenCalledWith(mockMessages, 'attachment_', 0);
				});
			});

			describe('folder filtering', () => {
				const folderId1 = 'AAMkADYyN2Q4ZTZlLTQ2ZDk1';
				const folderId2 = 'AAMkADYyN2Q4ZTZlLTQ2ZDk2';

				describe('trigger mode', () => {
					beforeEach(() => {
						mockPollFunctions.getMode.mockReturnValue('trigger');
						(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
					});

					it('should query folder endpoint instead of /messages when foldersToInclude is set', async () => {
						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: [folderId1] },
									options: {},
									output: 'simple',
								};
								return params[paramName] ?? defaultValue;
							},
						);

						await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							`/mailFolders/${folderId1}/messages`,
							0,
							undefined,
							{
								$select:
									'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments,receivedDateTime',
								$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`,
								$top: 100,
								$orderby: 'receivedDateTime asc',
							},
							undefined,
						);
						expect(microsoftApiRequest).toHaveBeenCalledTimes(1);
					});

					it('should query each folder endpoint and merge results when multiple foldersToInclude are set', async () => {
						const folder1Messages = [mockMessages[0]];
						const folder2Messages = [mockMessages[1]];
						(microsoftApiRequest as Mock)
							.mockResolvedValueOnce({ value: folder1Messages })
							.mockResolvedValueOnce({ value: folder2Messages });

						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: [folderId1, folderId2] },
									options: {},
									output: 'raw',
								};
								return params[paramName] ?? defaultValue;
							},
						);

						const { items: result } = await getPollResponse.call(
							mockPollFunctions,
							pollStartDate,
							pollEndDate,
						);

						expect(microsoftApiRequest).toHaveBeenCalledTimes(2);
						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							`/mailFolders/${folderId1}/messages`,
							0,
							undefined,
							expect.objectContaining({ $filter: expect.any(String) }),
							undefined,
						);
						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							`/mailFolders/${folderId2}/messages`,
							0,
							undefined,
							expect.objectContaining({ $filter: expect.any(String) }),
							undefined,
						);
						expect(result).toHaveLength(2); // one from each folder, merged
					});

					it('should not pass foldersToInclude to prepareFilterString', async () => {
						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: [folderId1], hasAttachments: true },
									options: {},
									output: 'simple',
								};
								return params[paramName] ?? defaultValue;
							},
						);

						await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

						expect(prepareFilterString).toHaveBeenCalledWith({
							filters: { hasAttachments: true },
						});
					});

					it('should fall back to /messages when foldersToInclude contains only empty strings', async () => {
						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: ['', ''] },
									options: {},
									output: 'simple',
								};
								return params[paramName] ?? defaultValue;
							},
						);

						await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							'/messages',
							0,
							undefined,
							expect.objectContaining({ $filter: expect.any(String) }),
							undefined,
						);
					});
				});

				describe('manual mode', () => {
					beforeEach(() => {
						mockPollFunctions.getMode.mockReturnValue('manual');
						(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
					});

					it('should query all folder endpoints with $top=1 in manual mode', async () => {
						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: [folderId1, folderId2] },
									options: {},
									output: 'simple',
								};
								return params[paramName] ?? defaultValue;
							},
						);

						await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

						expect(microsoftApiRequest).toHaveBeenCalledTimes(2);
						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							`/mailFolders/${folderId1}/messages`,
							0,
							undefined,
							{
								$select:
									'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
								$top: 1,
								$orderby: 'receivedDateTime desc',
							},
						);
						expect(microsoftApiRequest).toHaveBeenCalledWith(
							'GET',
							`/mailFolders/${folderId2}/messages`,
							0,
							undefined,
							{
								$select:
									'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments',
								$top: 1,
								$orderby: 'receivedDateTime desc',
							},
						);
					});

					it('should return email from second folder when first folder is empty in manual mode', async () => {
						mockPollFunctions.getNodeParameter.mockImplementation(
							(paramName: string, defaultValue?: any) => {
								const params: Record<string, any> = {
									filters: { foldersToInclude: [folderId1, folderId2] },
									options: {},
									output: 'raw',
								};
								return params[paramName] ?? defaultValue;
							},
						);
						(microsoftApiRequest as Mock)
							.mockResolvedValueOnce({ value: [] }) // folder A: no emails
							.mockResolvedValueOnce({ value: [mockMessages[1]] }); // folder B: 1 email

						const { items: result } = await getPollResponse.call(
							mockPollFunctions,
							pollStartDate,
							pollEndDate,
						);

						expect(microsoftApiRequest).toHaveBeenCalledTimes(2);
						expect(result).toHaveLength(1);
						expect(result[0].json).toEqual(mockMessages[1]);
					});
				});
			});

			describe('capped scheduled polls', () => {
				const at = (seconds: number) => new Date(Date.UTC(2023, 0, 1, 0, 0, seconds)).toISOString();
				const pageOf = (folder: string, times: number[], more: boolean) => ({
					value: times.map((t) => ({ id: `${folder}-${t}`, receivedDateTime: at(t) })),
					...(more && { '@odata.nextLink': `https://graph.microsoft.com/next/${folder}` }),
				});

				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('trigger');
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: { foldersToInclude: ['A', 'B'] },
								options: {},
								output: 'raw',
							};
							return params[paramName] ?? defaultValue;
						},
					);
				});

				it('should return the poll end date as cursor when no folder is capped', async () => {
					(microsoftApiRequest as Mock).mockResolvedValue(pageOf('A', [1, 2], false));

					const { cursor } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(cursor).toBe(pollEndDate);
				});

				it('should hold back newer messages of other folders when one folder is capped', async () => {
					// Folder A has a next page every time, so it stops at the cap (seconds 1-20).
					// Folder B fits in one page.
					let pageOfA = 0;
					(microsoftApiRequest as Mock).mockImplementation(async (_method, endpoint: string) => {
						if (endpoint.includes('/B/')) return pageOf('B', [5, 25], false);
						pageOfA++;
						return pageOf('A', [pageOfA * 2 - 1, pageOfA * 2], true);
					});

					const { items, cursor } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					const ids = items.map((item) => item.json.id);
					expect(ids).toContain('B-5');
					expect(ids).toContain('A-19');
					expect(ids).not.toContain('A-20');
					expect(ids).not.toContain('B-25');
					expect(cursor).toBe(at(20));
				});

				it('should merge folders oldest first', async () => {
					(microsoftApiRequest as Mock).mockImplementation(async (_method, endpoint: string) =>
						endpoint.includes('/A/') ? pageOf('A', [2, 4], false) : pageOf('B', [1, 3], false),
					);

					const { items } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(items.map((item) => item.json.id)).toEqual(['B-1', 'A-2', 'B-3', 'A-4']);
				});

				it('should not move the cursor past the poll end date', async () => {
					(microsoftApiRequest as Mock).mockImplementation(
						async (_method, endpoint: string, _index, _body, qs?: IDataObject) => {
							if (!endpoint.includes('/A/')) return pageOf('B', [], false);
							// The re-read of second 7 fits in one page.
							const reread = String(qs?.$filter).startsWith(`receivedDateTime ge ${at(7)}`);
							return pageOf('A', [7, 7], !reread);
						},
					);
					const pollEnd = new Date(Date.parse(at(7)) + 500).toISOString();

					const { cursor } = await getPollResponse.call(mockPollFunctions, pollStartDate, pollEnd);

					expect(cursor).toBe(pollEnd);
				});

				it('should leave the cursor at the poll end date when messages have no receivedDateTime', async () => {
					(microsoftApiRequest as Mock).mockResolvedValue({
						value: [{ id: 'no-date' }],
						'@odata.nextLink': 'https://graph.microsoft.com/next',
					});

					const { items, cursor } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(items.length).toBeGreaterThan(0);
					expect(cursor).toBe(pollEndDate);
				});

				it('should leave receivedDateTime out of the output when the selected fields do not include it', async () => {
					mockPollFunctions.getNodeParameter.mockImplementation(
						(paramName: string, defaultValue?: any) => {
							const params: Record<string, any> = {
								filters: {},
								options: {},
								output: 'fields',
								fields: ['id', 'subject'],
							};
							return params[paramName] ?? defaultValue;
						},
					);
					(microsoftApiRequest as Mock).mockResolvedValue({
						value: [{ id: 'msg1', subject: 'Hi', receivedDateTime: at(1) }],
					});

					const { items } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect((microsoftApiRequest as Mock).mock.calls[0][4].$select).toBe(
						'id,subject,receivedDateTime',
					);
					expect(items.map((item) => item.json)).toEqual([{ id: 'msg1', subject: 'Hi' }]);
				});

				it('should read the whole boundary second when every fetched message shares it', async () => {
					// 1,500 messages in folder A arrived at second 7: more than one capped read holds.
					const atSeven = (from: number, count: number) =>
						Array.from({ length: count }, (_, i) => ({
							id: `A-7-${from + i}`,
							receivedDateTime: at(7),
						}));
					let cappedPage = 0;
					(microsoftApiRequest as Mock).mockImplementation(
						async (_method, endpoint: string, _index, _body, qs?: IDataObject, uri?: string) => {
							if (endpoint.includes('/B/')) return pageOf('B', [7, 9], false);
							if (uri === 'second-page-2') return { value: atSeven(750, 750) };
							if (String(qs?.$filter).startsWith(`receivedDateTime ge ${at(7)}`)) {
								return { value: atSeven(0, 750), '@odata.nextLink': 'second-page-2' };
							}
							return { value: atSeven(cappedPage++ * 2, 2), '@odata.nextLink': 'next' };
						},
					);

					const { items, cursor } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					const ids = items.map((item) => item.json.id);
					expect(new Set(ids).size).toBe(ids.length);
					expect(ids.filter((id) => String(id).startsWith('A-7-'))).toHaveLength(1500);
					expect(ids).toContain('B-7');
					expect(ids).not.toContain('B-9');
					expect(cursor).toBe(at(8));
				});
			});

			describe('output formats', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
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

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$top: 1,
						$orderby: 'receivedDateTime desc',
					});
					expect(simplifyOutputMessages).not.toHaveBeenCalled();
					expect(result).toHaveLength(1);
				});
			});

			describe('edge cases', () => {
				beforeEach(() => {
					mockPollFunctions.getMode.mockReturnValue('manual');
				});

				it('should handle empty response', async () => {
					(microsoftApiRequest as Mock).mockResolvedValue({ value: [] });
					(simplifyOutputMessages as Mock).mockReturnValue([]);

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

					expect(result).toHaveLength(0);
					expect(result).toEqual([]);
				});

				it('should handle null response values', async () => {
					(microsoftApiRequest as Mock).mockResolvedValue({ value: null });
					const mockJsonArray = vi.fn().mockReturnValue([]);
					mockPollFunctions.helpers.returnJsonArray = mockJsonArray;

					const { items: result } = await getPollResponse.call(
						mockPollFunctions,
						pollStartDate,
						pollEndDate,
					);

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
					(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
					(downloadAttachments as Mock).mockResolvedValue([]);

					await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);

					expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
						$select: 'id,subject,hasAttachments',
						$top: 1,
						$orderby: 'receivedDateTime desc',
					});
				});
			});
		});

		describe('error handling', () => {
			it('should throw NodeApiError when microsoftApiRequest fails', async () => {
				const originalError = new Error('API request failed');
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);

				expect(mockPollFunctions.getNode).toHaveBeenCalled();
			});

			it('should throw NodeApiError when a scheduled poll request fails', async () => {
				const originalError = new Error('All items request failed');
				mockPollFunctions.getMode.mockReturnValue('trigger');
				(microsoftApiRequest as Mock).mockRejectedValue(originalError);

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
				(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
				(downloadAttachments as Mock).mockRejectedValue(originalError);

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);
			});

			it('should throw NodeApiError when simplifyOutputMessages fails', async () => {
				const originalError = new Error('Simplify output failed');
				mockPollFunctions.getMode.mockReturnValue('manual');
				(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
				(simplifyOutputMessages as Mock).mockImplementation(() => {
					throw originalError;
				});

				await expect(
					getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate),
				).rejects.toThrow(NodeApiError);
			});

			it('should throw NodeApiError when prepareFilterString fails', async () => {
				const originalError = new Error('Filter preparation failed');
				mockPollFunctions.getMode.mockReturnValue('trigger');
				(prepareFilterString as Mock).mockImplementation(() => {
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
				(microsoftApiRequest as Mock).mockRejectedValue(originalError);

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
				(microsoftApiRequest as Mock).mockRejectedValue(originalError);

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
				(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
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

				const { items: result } = await getPollResponse.call(
					mockPollFunctions,
					pollStartDate,
					pollEndDate,
				);

				expect(prepareFilterString).toHaveBeenCalledWith({ filters: {} });
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

				const { items: result } = await getPollResponse.call(
					mockPollFunctions,
					pollStartDate,
					pollEndDate,
				);

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

				const { items: result } = await getPollResponse.call(
					mockPollFunctions,
					pollStartDate,
					pollEndDate,
				);

				expect(microsoftApiRequest).toHaveBeenCalledWith('GET', '/messages', 0, undefined, {
					$select: '',
					$top: 1,
					$orderby: 'receivedDateTime desc',
				});
				expect(result).toHaveLength(1);
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
				(prepareFilterString as Mock).mockReturnValue(complexFilter);
				(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });

				const { items: result } = await getPollResponse.call(
					mockPollFunctions,
					pollStartDate,
					pollEndDate,
				);

				expect(prepareFilterString).toHaveBeenCalledWith({
					filters: { isRead: false, fromAddress: 'test@example.com' },
				});
				expect(microsoftApiRequest).toHaveBeenCalledWith(
					'GET',
					'/messages',
					0,
					undefined,
					{
						$select: 'id,subject,from,isRead,receivedDateTime',
						$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate} and (${complexFilter})`,
						$top: 100,
						$orderby: 'receivedDateTime asc',
					},
					undefined,
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
				(prepareFilterString as Mock).mockReturnValue('isRead eq false');
				(microsoftApiRequest as Mock).mockResolvedValue({ value: mockMessages });
				(downloadAttachments as Mock).mockResolvedValue(mockExecutionData);

				const { items: result } = await getPollResponse.call(
					mockPollFunctions,
					pollStartDate,
					pollEndDate,
				);

				expect(microsoftApiRequest).toHaveBeenCalledWith(
					'GET',
					'/messages',
					0,
					undefined,
					{
						$select: 'id,subject,hasAttachments,receivedDateTime',
						$filter: `receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate} and (isRead eq false)`,
						$top: 100,
						$orderby: 'receivedDateTime asc',
					},
					undefined,
				);
				expect(downloadAttachments).toHaveBeenCalledWith(
					mockMessages.map(({ receivedDateTime, ...message }) => message),
					'prefix_',
					0,
				);
				expect(result).toEqual(mockExecutionData);
			});
		});
	});
});
