import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData, IBinaryData } from 'n8n-workflow';

import { PegaLaunchpad } from '../PegaLaunchpad.node';

/**
 * Comprehensive tests for all Pega Launchpad node operations.
 *
 * Resources & Operations:
 *   Assignment: get, performAction
 *   Attachment: get, delete, linkToCase, upload
 *   Case:       create, get, getAttachments, getHistory, getMany, queryCases
 *   Pulse:      add, get, reply
 *   User:       createPersona, getMany, markAsActive, markAsInactive
 */

describe('PegaLaunchpad Node – Operation Tests', () => {
	let node: PegaLaunchpad;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockRequestOAuth2: jest.Mock;
	let mockNode: INode;

	const BASE_URL = 'https://test.pegalaunchpad.com';

	beforeEach(() => {
		node = new PegaLaunchpad();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = jest.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node-id',
			name: 'PegaLaunchpad',
			type: 'n8n-nodes-base.pegaLaunchpad',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

		// Default: helpers stubs for constructExecutionMetaData & returnJsonArray
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: INodeExecutionData[]) => data,
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any) => [
			{ json: data },
		]);

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	/** Default mock response headers returned for every API call. */
	const MOCK_RESPONSE_HEADERS = {
		etag: 'w/"1"',
		'content-type': 'application/json',
	};

	/**
	 * Wrap a body object in the resolveWithFullResponse structure that
	 * n8n's request helper returns when `resolveWithFullResponse: true`.
	 */
	function fullResponse(body: Record<string, any>, headers = MOCK_RESPONSE_HEADERS) {
		return { body, headers, statusCode: 200 };
	}

	// Helper to configure getNodeParameter mock
	function setupParams(params: Record<string, any>) {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex?: number, fallback?: any) => {
				if (paramName in params) return params[paramName];
				return fallback ?? '';
			},
		);
	}

	// ====================================================================
	//                          CASE
	// ====================================================================
	describe('Resource: Case', () => {
		describe('Operation: create', () => {
			it('should POST to /cases with parsed JSON content', async () => {
				const apiResponse = { ID: 'CASE-001', status: 'New' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'create',
					baseUrl: BASE_URL,
					caseTypeId: 'BookingRequestCase',
					processId: 'pyStartCase',
					content: '{"GuestName": "John", "RoomType": "Suite"}',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/cases`,
						body: {
							caseTypeID: 'BookingRequestCase',
							processID: 'pyStartCase',
							content: { GuestName: 'John', RoomType: 'Suite' },
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should throw NodeOperationError on invalid JSON content', async () => {
				setupParams({
					resource: 'case',
					operation: 'create',
					baseUrl: BASE_URL,
					caseTypeId: 'BookingRequestCase',
					content: '{ invalid json }',
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('should handle empty content gracefully', async () => {
				const apiResponse = { ID: 'CASE-002' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'create',
					baseUrl: BASE_URL,
					caseTypeId: 'BookingRequestCase',
					processId: 'pyStartCase',
					content: '',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: {
							caseTypeID: 'BookingRequestCase',
							processID: 'pyStartCase',
							content: {},
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: get', () => {
			it('should POST to /data_views/{lookupDataPage} with dataViewParameters', async () => {
				const apiResponse = { ID: 'CASE-001', caseTypeName: 'Booking' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'get',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					lookupDataPage: 'ClaimLookUp',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/ClaimLookUp`,
						body: {
							dataViewParameters: {
								ID: 'CASE-001',
							},
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: getAttachments', () => {
			it('should GET /cases/{caseId}/attachments', async () => {
				const apiResponse = { attachments: [{ ID: 'ATT-1', name: 'doc.pdf' }] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'getAttachments',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: `${BASE_URL}/dx/api/application/v2/cases/CASE-001/attachments`,
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: getHistory', () => {
			it('should POST to /data_views/ObjectHistory with default fields', async () => {
				const apiResponse = { data: [{ CreateDateTime: '2024-01-01', MessageText: 'Created' }] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'getHistory',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					pageSize: 25,
					additionalFields: {},
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/ObjectHistory`,
						body: {
							dataViewParameters: { ObjectID: 'CASE-001' },
							paging: { pageNumber: 1, pageSize: 25 },
							query: {
								select: [
									{ field: 'CreateDateTime' },
									{ field: 'MessageText' },
									{ field: 'PerformerUserName' },
									{ field: 'ID' },
								],
							},
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should use custom fields and page number when provided', async () => {
				const apiResponse = { data: [] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'getHistory',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					pageSize: 10,
					additionalFields: {
						pageNumber: 3,
						fields: {
							fieldValues: [{ field: 'CreateDateTime' }, { field: 'MessageText' }],
						},
					},
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: expect.objectContaining({
							paging: { pageNumber: 3, pageSize: 10 },
							query: {
								select: [{ field: 'CreateDateTime' }, { field: 'MessageText' }],
							},
						}),
					}),
				);
			});
		});

		describe('Operation: getMany', () => {
			it('should POST to /data_views/{dataPageId} with default fields', async () => {
				const apiResponse = { resultCount: 2, data: [{ Name: 'Case A' }, { Name: 'Case B' }] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'case',
					operation: 'getMany',
					baseUrl: BASE_URL,
					dataPageId: 'ClaimList',
					fields: {},
					limit: 50,
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/ClaimList`,
						body: {
							query: {
								select: [
									{ field: 'Name' },
									{ field: 'Status' },
									{ field: 'BusinessID' },
									{ field: 'Description' },
									{ field: 'ID' },
									{ field: '@class' },
								],
								distinctResultsOnly: true,
							},
							paging: { pageNumber: 1, pageSize: 50 },
							useExtendedTimeout: false,
						},
					}),
				);
			});

			it('should use custom fields when provided', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ data: [] }));

				setupParams({
					resource: 'case',
					operation: 'getMany',
					baseUrl: BASE_URL,
					dataPageId: 'ClaimList',
					fields: {
						fieldValues: [{ field: 'Name' }, { field: 'Status' }],
					},
					limit: 10,
					additionalFields: { distinctResultsOnly: false, pageNumber: 2 },
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: expect.objectContaining({
							query: {
								select: [{ field: 'Name' }, { field: 'Status' }],
								distinctResultsOnly: false,
							},
							paging: { pageNumber: 2, pageSize: 10 },
						}),
					}),
				);
			});
		});

		describe('Operation: queryCases', () => {
			it('should POST to /data_views/{dataPageName} with filter', async () => {
				const apiResponse = { data: [{ Name: 'Filtered Case' }] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				const filter = JSON.stringify({
					logic: 'AND',
					filterConditions: [
						{ lhs: { field: 'Status' }, comparator: 'EQ', rhs: { value: 'Open' } },
					],
				});

				setupParams({
					resource: 'case',
					operation: 'queryCases',
					baseUrl: BASE_URL,
					dataPageName: 'CaseSearch',
					pageSize: 20,
					fields: {},
					filter,
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/CaseSearch`,
						body: expect.objectContaining({
							query: expect.objectContaining({
								filter: {
									logic: 'AND',
									filterConditions: [
										{ lhs: { field: 'Status' }, comparator: 'EQ', rhs: { value: 'Open' } },
									],
								},
							}),
						}),
					}),
				);
			});

			it('should throw on invalid filter JSON', async () => {
				setupParams({
					resource: 'case',
					operation: 'queryCases',
					baseUrl: BASE_URL,
					dataPageName: 'CaseSearch',
					pageSize: 20,
					fields: {},
					filter: '{ bad json',
					additionalFields: {},
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('should skip filter if empty object', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ data: [] }));

				setupParams({
					resource: 'case',
					operation: 'queryCases',
					baseUrl: BASE_URL,
					dataPageName: 'CaseSearch',
					pageSize: 20,
					fields: {},
					filter: '{}',
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				const callBody = mockRequestOAuth2.mock.calls[0][1].body;
				expect(callBody.query.filter).toBeUndefined();
			});
		});
	});

	// ====================================================================
	//                        ATTACHMENT
	// ====================================================================
	describe('Resource: Attachment', () => {
		describe('Operation: get', () => {
			it('should GET /attachments/{attachmentId}', async () => {
				const apiResponse = { ID: 'ATT-001', name: 'report.pdf', category: 'File' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'attachment',
					operation: 'get',
					baseUrl: BASE_URL,
					attachmentId: 'ATT-001',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: `${BASE_URL}/dx/api/application/v2/attachments/ATT-001`,
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: delete', () => {
			it('should DELETE /attachments/{attachmentId}', async () => {
				const apiResponse = {};
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'attachment',
					operation: 'delete',
					baseUrl: BASE_URL,
					attachmentId: 'ATT-001',
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'DELETE',
						url: `${BASE_URL}/dx/api/application/v2/attachments/ATT-001`,
					}),
				);
			});
		});

		describe('Operation: linkToCase', () => {
			it('should POST /cases/{caseId}/attachments with attachment body', async () => {
				const apiResponse = { status: 'linked' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'attachment',
					operation: 'linkToCase',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					attachmentId: 'ATT-001',
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/cases/CASE-001/attachments`,
						body: {
							attachments: [
								{
									type: 'File',
									category: 'File',
									ID: 'ATT-001',
								},
							],
						},
					}),
				);
			});

			it('should use custom type and category from additionalFields', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'attachment',
					operation: 'linkToCase',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					attachmentId: 'ATT-001',
					additionalFields: { type: 'Document', category: 'Evidence' },
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: {
							attachments: [
								{
									type: 'Document',
									category: 'Evidence',
									ID: 'ATT-001',
								},
							],
						},
					}),
				);
			});
		});

		describe('Operation: upload', () => {
			it('should upload file and automatically link to case (default behavior)', async () => {
				const uploadResponse = { ID: 'ATT-NEW', fileName: 'test.pdf' };
				const linkResponse = { status: 'linked' };
				// First call = upload (resolveWithFullResponse), second call = link to case (via pegaLaunchpadApiRequest)
				mockRequestOAuth2
					.mockResolvedValueOnce(fullResponse(uploadResponse))
					.mockResolvedValueOnce(fullResponse(linkResponse));

				const binaryData: IBinaryData = {
					data: '',
					mimeType: 'application/pdf',
					fileName: 'test.pdf',
				};
				const binaryBuffer = Buffer.from('fake-pdf-content');

				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					binaryBuffer,
				);

				setupParams({
					resource: 'attachment',
					operation: 'upload',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					binaryPropertyName: 'data',
					additionalFields: {},
				});

				const result = await node.execute.call(mockExecuteFunctions);

				// Verify upload call (first)
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/attachments/upload`,
						formData: expect.objectContaining({
							appendUniqueIdToFileName: 'true',
							contextID: 'CASE-001',
						}),
					}),
				);

				// Verify link-to-case call (second)
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/cases/CASE-001/attachments`,
						body: {
							attachments: [{ type: 'File', category: 'File', ID: 'ATT-NEW' }],
						},
					}),
				);

				// 2 API calls total
				expect(mockRequestOAuth2).toHaveBeenCalledTimes(2);

				// Combined response
				expect(result[0][0].json).toEqual({
					...uploadResponse,
					linkedToCase: true,
					linkResponse: linkResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should skip link-to-case when linkToCase is false', async () => {
				const uploadResponse = { ID: 'ATT-ONLY', fileName: 'doc.pdf' };
				mockRequestOAuth2.mockResolvedValueOnce(fullResponse(uploadResponse));

				const binaryData: IBinaryData = {
					data: '',
					mimeType: 'application/pdf',
					fileName: 'doc.pdf',
				};
				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					Buffer.from('pdf'),
				);

				setupParams({
					resource: 'attachment',
					operation: 'upload',
					baseUrl: BASE_URL,
					caseId: 'CASE-002',
					binaryPropertyName: 'data',
					additionalFields: { linkToCase: false },
				});

				const result = await node.execute.call(mockExecuteFunctions);

				// Only 1 API call (upload only, no link)
				expect(mockRequestOAuth2).toHaveBeenCalledTimes(1);
				expect(result[0][0].json).toEqual({
					...uploadResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should use custom type and category when linking', async () => {
				const uploadResponse = { ID: 'ATT-CUSTOM' };
				const linkResponse = { status: 'linked' };
				mockRequestOAuth2
					.mockResolvedValueOnce(fullResponse(uploadResponse))
					.mockResolvedValueOnce(fullResponse(linkResponse));

				const binaryData: IBinaryData = {
					data: '',
					mimeType: 'image/png',
					fileName: 'evidence.png',
				};
				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					Buffer.from('png'),
				);

				setupParams({
					resource: 'attachment',
					operation: 'upload',
					baseUrl: BASE_URL,
					caseId: 'CASE-003',
					binaryPropertyName: 'data',
					additionalFields: {
						linkToCase: true,
						type: 'Document',
						category: 'Evidence',
					},
				});

				await node.execute.call(mockExecuteFunctions);

				// Verify the link call uses custom type/category
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: {
							attachments: [{ type: 'Document', category: 'Evidence', ID: 'ATT-CUSTOM' }],
						},
					}),
				);
			});

			it('should default appendUniqueIdToFileName to true', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ ID: 'ATT-X' }));

				const binaryData: IBinaryData = {
					data: '',
					mimeType: 'image/png',
					fileName: 'screenshot.png',
				};
				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					Buffer.from('png'),
				);

				setupParams({
					resource: 'attachment',
					operation: 'upload',
					baseUrl: BASE_URL,
					caseId: 'CASE-002',
					binaryPropertyName: 'data',
					additionalFields: { linkToCase: false },
				});

				await node.execute.call(mockExecuteFunctions);

				const callArgs = mockRequestOAuth2.mock.calls[0][1];
				expect(callArgs.formData.appendUniqueIdToFileName).toBe('true');
			});

			it('should strip trailing slash from base URL', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ ID: 'ATT-Y' }));

				const binaryData: IBinaryData = {
					data: '',
					mimeType: 'text/plain',
				};
				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(binaryData);
				(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
					Buffer.from('text'),
				);

				setupParams({
					resource: 'attachment',
					operation: 'upload',
					baseUrl: `${BASE_URL}/`,
					caseId: 'CASE-001',
					binaryPropertyName: 'data',
					additionalFields: { linkToCase: false },
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						url: `${BASE_URL}/dx/api/application/v2/attachments/upload`,
					}),
				);
			});
		});
	});

	// ====================================================================
	//                          PULSE
	// ====================================================================
	describe('Resource: Pulse', () => {
		describe('Operation: add', () => {
			it('should POST to /messages with message and context', async () => {
				const apiResponse = { messageID: 'MSG-001' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'pulse',
					operation: 'add',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					message: 'This is a pulse message',
					additionalFields: {},
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/messages`,
						body: {
							message: 'This is a pulse message',
							context: 'CASE-001',
							parentMessageId: '',
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should include parentMessageId from additionalFields', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'pulse',
					operation: 'add',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					message: 'Reply msg',
					additionalFields: { parentMessageId: 'MSG-PARENT' },
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: expect.objectContaining({
							parentMessageId: 'MSG-PARENT',
						}),
					}),
				);
			});
		});

		describe('Operation: get', () => {
			it('should GET /feeds/pyCaseFeed with filterFor query', async () => {
				const apiResponse = {
					pulseFeed: [{ messageID: 'MSG-001', message: 'Hello' }],
				};
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'pulse',
					operation: 'get',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: `${BASE_URL}/dx/api/application/v2/feeds/pyCaseFeed?filterFor=CASE-001`,
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: reply', () => {
			it('should POST to /messages with parentMessageId', async () => {
				const apiResponse = { messageID: 'MSG-002' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'pulse',
					operation: 'reply',
					baseUrl: BASE_URL,
					caseId: 'CASE-001',
					parentMessageId: 'MSG-001',
					message: 'This is a reply',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/messages`,
						body: {
							message: 'This is a reply',
							context: 'CASE-001',
							parentMessageId: 'MSG-001',
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});
	});

	// ====================================================================
	//                        ASSIGNMENT
	// ====================================================================
	describe('Resource: Assignment', () => {
		describe('Operation: get', () => {
			it('should GET /assignments/{assignmentId}', async () => {
				const apiResponse = { ID: 'ASSIGN-001', name: 'Review Claim', status: 'Open' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'assignment',
					operation: 'get',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: `${BASE_URL}/dx/api/application/v2/assignments/ASSIGN-001`,
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});
		});

		describe('Operation: performAction', () => {
			it('should PATCH /assignments/{id}/actions/{action} with If-Match header (lowercase w/ preserved)', async () => {
				const apiResponse = { status: 'completed' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'assignment',
					operation: 'performAction',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
					actionName: 'CollectClaimInfo',
					ifMatch: 'w/"1"',
					content: '{"ClaimAmount": 5000}',
					outcome: '',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'PATCH',
						url: `${BASE_URL}/dx/api/application/v2/assignments/ASSIGN-001/actions/CollectClaimInfo`,
						body: {
							content: { ClaimAmount: 5000 },
							pageInstructions: [],
						},
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'If-Match': 'w/"1"', // lowercase w/ preserved for Pega compatibility
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should normalise lowercase w/ ETag to uppercase W/', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'assignment',
					operation: 'performAction',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
					actionName: 'Submit',
					ifMatch: 'w/"42"',
					content: '{}',
					outcome: '',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.headers['If-Match']).toBe('w/"42"');
			});

			it('should normalise uppercase W/ ETag to lowercase w/', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'assignment',
					operation: 'performAction',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
					actionName: 'Submit',
					ifMatch: 'W/"42"',
					content: '{}',
					outcome: '',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.headers['If-Match']).toBe('w/"42"');
			});

			it('should append outcome query param when provided', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'assignment',
					operation: 'performAction',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
					actionName: 'Review',
					ifMatch: 'w/"1"',
					content: '{}',
					outcome: 'Approved',
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						url: `${BASE_URL}/dx/api/application/v2/assignments/ASSIGN-001/actions/Review?outcome=Approved`,
					}),
				);
			});

			it('should throw on invalid JSON content', async () => {
				setupParams({
					resource: 'assignment',
					operation: 'performAction',
					baseUrl: BASE_URL,
					assignmentId: 'ASSIGN-001',
					actionName: 'Submit',
					ifMatch: 'w/"1"',
					content: '{ broken }',
					outcome: '',
				});

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});
		});
	});

	// ====================================================================
	//                          USER
	// ====================================================================
	describe('Resource: User', () => {
		describe('Operation: createPersona', () => {
			it('should POST to /objects with objectTypeID and content', async () => {
				const apiResponse = { ID: 'OBJ-001', status: 'Created' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'user',
					operation: 'createPersona',
					baseUrl: BASE_URL,
					personaId: 'Admin',
					content: '{"FirstName": "John", "LastName": "Doe"}',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/objects`,
						body: {
							objectTypeID: 'Admin',
							content: { FirstName: 'John', LastName: 'Doe' },
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should handle empty content for createPersona', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'user',
					operation: 'createPersona',
					baseUrl: BASE_URL,
					personaId: 'Operator',
					content: '',
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						body: {
							objectTypeID: 'Operator',
							content: {},
						},
					}),
				);
			});
		});

		describe('Operation: getMany', () => {
			it('should POST to /data_views/{dataPageName} with paging', async () => {
				const apiResponse = { data: [{ Name: 'User 1' }, { Name: 'User 2' }] };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'user',
					operation: 'getMany',
					baseUrl: BASE_URL,
					dataPageName: 'UserList',
					fields: {},
					limit: 50,
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/UserList`,
						body: {
							dataViewParameters: {},
							paging: { pageNumber: 1, pageSize: 50 },
							query: {
								select: [
									{ field: 'BusinessID' },
									{ field: 'Name' },
									{ field: 'Status' },
									{ field: 'Description' },
									{ field: 'ID' },
									{ field: '@class' },
								],
							},
						},
					}),
				);
			});
		});

		describe('Operation: markAsActive', () => {
			it('should PATCH /objects/{objectId}/actions/MarkAsActive with If-Match (lowercase w/ preserved)', async () => {
				const apiResponse = { status: 'Active' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'user',
					operation: 'markAsActive',
					baseUrl: BASE_URL,
					objectId: 'OBJ-001',
					ifMatch: 'w/"2"',
					reason: 'User requested reactivation',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'PATCH',
						url: `${BASE_URL}/dx/api/application/v2/objects/OBJ-001/actions/MarkAsActive`,
						body: {
							content: { ReasonForStatusUpdate: 'User requested reactivation' },
							pageInstructions: [],
						},
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'If-Match': 'w/"2"',
						},
					}),
				);
				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should normalise lowercase w/ ETag for markAsActive', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'user',
					operation: 'markAsActive',
					baseUrl: BASE_URL,
					objectId: 'OBJ-002',
					ifMatch: 'w/"5"',
					reason: 'Reactivated',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.headers['If-Match']).toBe('w/"5"');
			});
		});

		describe('Operation: markAsInactive', () => {
			it('should PATCH /objects/{objectId}/actions/MarkAsInactive with If-Match (lowercase w/ preserved)', async () => {
				const apiResponse = { status: 'Inactive' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'user',
					operation: 'markAsInactive',
					baseUrl: BASE_URL,
					objectId: 'OBJ-001',
					ifMatch: 'w/"3"',
					reason: 'Account suspension',
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'PATCH',
						url: `${BASE_URL}/dx/api/application/v2/objects/OBJ-001/actions/MarkAsInactive`,
						body: {
							content: { ReasonForStatusUpdate: 'Account suspension' },
							pageInstructions: [],
						},
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'If-Match': 'w/"3"',
						},
					}),
				);
			});

			it('should normalise lowercase w/ ETag for markAsInactive', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({}));

				setupParams({
					resource: 'user',
					operation: 'markAsInactive',
					baseUrl: BASE_URL,
					objectId: 'OBJ-003',
					ifMatch: 'w/"10"',
					reason: 'Departed',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.headers['If-Match']).toBe('w/"10"');
			});
		});
	});

	// ====================================================================
	//                          AGENT
	// ====================================================================
	describe('Resource: Agent', () => {
		describe('Operation: initiateConversation', () => {
			it('should POST to /ai-agents/{agentName}/conversations with url-encoded body', async () => {
				const apiResponse = { conversationID: 'CONV-001', status: 'Active' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'agent',
					operation: 'initiateConversation',
					baseUrl: BASE_URL,
					agentName: 'TestApp__SummaryAgent',
					contextId: 'STE6VGVzdEFwcF9fQ2xhaW1fNjlhODQ3M2FmYmIz',
					additionalFields: {},
				});

				const result = await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.method).toBe('POST');
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/TestApp__SummaryAgent/conversations`,
				);
				expect(callOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

				const sentBody = JSON.parse(callOptions.body);
				expect(sentBody.contextID).toBe('STE6VGVzdEFwcF9fQ2xhaW1fNjlhODQ3M2FmYmIz');
				expect(sentBody.executeStarterQuestion).toBe(false);

				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should set executeStarterQuestion to true when provided', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ conversationID: 'CONV-002' }));

				setupParams({
					resource: 'agent',
					operation: 'initiateConversation',
					baseUrl: BASE_URL,
					agentName: 'TestApp__SummaryAgent',
					contextId: 'CTX-ABC',
					additionalFields: { executeStarterQuestion: true },
				});

				await node.execute.call(mockExecuteFunctions);

				const sentBody = JSON.parse(mockRequestOAuth2.mock.calls[0][1].body);
				expect(sentBody.executeStarterQuestion).toBe(true);
			});

			it('should URL-encode agent name in the path', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ conversationID: 'CONV-003' }));

				setupParams({
					resource: 'agent',
					operation: 'initiateConversation',
					baseUrl: BASE_URL,
					agentName: 'App With Spaces',
					contextId: 'CTX-001',
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/App%20With%20Spaces/conversations`,
				);
			});

			it('should strip trailing slash from base URL', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ conversationID: 'CONV-004' }));

				setupParams({
					resource: 'agent',
					operation: 'initiateConversation',
					baseUrl: `${BASE_URL}/`,
					agentName: 'TestAgent',
					contextId: 'CTX-001',
					additionalFields: {},
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/TestAgent/conversations`,
				);
			});
		});

		describe('Operation: sendMessage', () => {
			it('should PATCH to /ai-agents/{agentId}/conversations/{conversationId} with request body', async () => {
				const apiResponse = { response: 'Hello! How can I help?', status: 'Active' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'agent',
					operation: 'sendMessage',
					baseUrl: BASE_URL,
					agentId: 'TestApp__SummaryAgent',
					conversationId: 'CONV-001',
					request: 'Hi',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.method).toBe('PATCH');
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/TestApp__SummaryAgent/conversations/CONV-001`,
				);
				expect(callOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

				const sentBody = JSON.parse(callOptions.body);
				expect(sentBody.request).toBe('Hi');

				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should URL-encode agent ID and conversation ID in the path', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ response: 'OK' }));

				setupParams({
					resource: 'agent',
					operation: 'sendMessage',
					baseUrl: BASE_URL,
					agentId: 'App With Spaces',
					conversationId: 'conv/123',
					request: 'Hello',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/App%20With%20Spaces/conversations/conv%2F123`,
				);
			});

			it('should strip trailing slash from base URL', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ response: 'OK' }));

				setupParams({
					resource: 'agent',
					operation: 'sendMessage',
					baseUrl: `${BASE_URL}/`,
					agentId: 'TestAgent',
					conversationId: 'CONV-001',
					request: 'Test',
				});

				await node.execute.call(mockExecuteFunctions);

				const callOptions = mockRequestOAuth2.mock.calls[0][1];
				expect(callOptions.url).toBe(
					`${BASE_URL}/dx/api/application/v2/ai-agents/TestAgent/conversations/CONV-001`,
				);
			});
		});

		describe('Operation: getFinalResponse', () => {
			it('should POST to /data_views/GetAgentFinalResponse with ConversationID', async () => {
				const apiResponse = { finalResponse: 'Here is your summary.', status: 'Complete' };
				mockRequestOAuth2.mockResolvedValue(fullResponse(apiResponse));

				setupParams({
					resource: 'agent',
					operation: 'getFinalResponse',
					baseUrl: BASE_URL,
					conversationId: 'STE6UGVnYVBsYXRmb3JtX19BZ2VudENvbnZl',
				});

				const result = await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						url: `${BASE_URL}/dx/api/application/v2/data_views/GetAgentFinalResponse`,
						body: {
							dataViewParameters: {
								ConversationID: 'STE6UGVnYVBsYXRmb3JtX19BZ2VudENvbnZl',
							},
						},
					}),
				);

				expect(result[0][0].json).toEqual({
					...apiResponse,
					responseHeaders: MOCK_RESPONSE_HEADERS,
				});
			});

			it('should use JSON content-type (standard API request)', async () => {
				mockRequestOAuth2.mockResolvedValue(fullResponse({ finalResponse: 'Done' }));

				setupParams({
					resource: 'agent',
					operation: 'getFinalResponse',
					baseUrl: BASE_URL,
					conversationId: 'CONV-XYZ',
				});

				await node.execute.call(mockExecuteFunctions);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'pegaOAuth2Api',
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
						}),
					}),
				);
			});
		});
	});

	// ====================================================================
	//                     ERROR HANDLING
	// ====================================================================
	describe('Error Handling', () => {
		it('should continue on fail when continueOnFail is true', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockRequestOAuth2.mockRejectedValue(new Error('API Error'));

			setupParams({
				resource: 'case',
				operation: 'get',
				baseUrl: BASE_URL,
				caseId: 'CASE-FAIL',
				lookupDataPage: 'ClaimLookUp',
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'API Error' });
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			mockRequestOAuth2.mockRejectedValue(new Error('Server Error'));

			setupParams({
				resource: 'case',
				operation: 'get',
				baseUrl: BASE_URL,
				caseId: 'CASE-FAIL',
				lookupDataPage: 'ClaimLookUp',
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Server Error');
		});
	});

	// ====================================================================
	//                     BASE URL HANDLING
	// ====================================================================
	describe('Base URL Handling', () => {
		it('should strip trailing slash from base URL in API requests', async () => {
			mockRequestOAuth2.mockResolvedValue(fullResponse({}));

			setupParams({
				resource: 'case',
				operation: 'get',
				baseUrl: `${BASE_URL}/`,
				caseId: 'CASE-001',
				lookupDataPage: 'ClaimLookUp',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'pegaOAuth2Api',
				expect.objectContaining({
					url: `${BASE_URL}/dx/api/application/v2/data_views/ClaimLookUp`,
				}),
			);
		});
	});
});
