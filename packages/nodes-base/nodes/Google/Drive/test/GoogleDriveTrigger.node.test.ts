import { mockDeep } from 'vitest-mock-extended';
import moment from 'moment-timezone';
import type { IPollFunctions, INode, ILoadOptionsFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { GoogleDriveTrigger } from '../GoogleDriveTrigger.node';
import * as GenericFunctions from '../v1/GenericFunctions';
import * as listSearch from '../v2/methods/listSearch';
import type { Mock, Mocked } from 'vitest';

vi.mock('../v1/GenericFunctions', () => ({
	extractId: vi.fn(),
	googleApiRequest: vi.fn(),
	googleApiRequestAllItems: vi.fn(),
}));

vi.mock('../v2/methods/listSearch', () => ({
	fileSearch: vi.fn(),
	folderSearch: vi.fn(),
}));

describe('GoogleDriveTrigger', () => {
	let trigger: GoogleDriveTrigger;
	let mockPollFunctions: Mocked<IPollFunctions>;
	let mockNode: INode;

	const extractIdSpy = vi.spyOn(GenericFunctions, 'extractId');
	const googleApiRequestSpy = vi.spyOn(GenericFunctions, 'googleApiRequest');
	const googleApiRequestAllItemsSpy = vi.spyOn(GenericFunctions, 'googleApiRequestAllItems');

	beforeEach(() => {
		trigger = new GoogleDriveTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Google Drive Trigger Test',
			type: 'n8n-nodes-base.googleDriveTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		vi.clearAllMocks();

		mockPollFunctions.getNode.mockReturnValue(mockNode);
		mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
		mockPollFunctions.getMode.mockReturnValue('trigger');
		(mockPollFunctions.helpers.returnJsonArray as Mock).mockImplementation((data: unknown[]) =>
			data.map((item: unknown, index: number) => ({ json: item, pairedItem: { item: index } })),
		);
		extractIdSpy.mockImplementation((id) => id);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Methods', () => {
		it('should have correct list search methods', () => {
			expect(trigger.methods?.listSearch?.fileSearch).toBe(listSearch.fileSearch);
			expect(trigger.methods?.listSearch?.folderSearch).toBe(listSearch.folderSearch);
		});

		it('should have correct load options methods', () => {
			expect(trigger.methods?.loadOptions?.getDrives).toBeDefined();
		});

		describe('getDrives', () => {
			it('should return drives with root option', async () => {
				const mockDrives = [
					{ id: 'drive1', name: 'My Drive 1' },
					{ id: 'drive2', name: 'My Drive 2' },
				];

				const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				googleApiRequestAllItemsSpy.mockResolvedValue(mockDrives);

				const result = await trigger.methods.loadOptions.getDrives.call(mockLoadOptionsFunctions);

				expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'drives',
					'GET',
					'/drive/v3/drives',
				);

				expect(result).toEqual([
					{ name: 'Root', value: 'root' },
					{ name: 'My Drive 1', value: 'drive1' },
					{ name: 'My Drive 2', value: 'drive2' },
				]);
			});

			it('should handle empty drives list', async () => {
				const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				googleApiRequestAllItemsSpy.mockResolvedValue([]);

				const result = await trigger.methods.loadOptions.getDrives.call(mockLoadOptionsFunctions);

				expect(result).toEqual([{ name: 'Root', value: 'root' }]);
			});
		});
	});

	describe('Poll Function - Parameter Setup', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});
		});

		it('should handle specific file trigger', async () => {
			const now = moment().utc();
			const webhookData = { lastTimeChecked: now.clone().subtract(1, 'hour').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			const mockFile = {
				id: 'test-file-id',
				name: 'Test File',
				mimeType: 'application/pdf',
				trashed: false,
				modifiedTime: now.format(),
			};

			extractIdSpy.mockReturnValue('test-file-id');
			googleApiRequestSpy.mockResolvedValue(mockFile);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
			expect(googleApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/drive/v3/files/test-file-id',
				{},
				{ supportsAllDrives: true, fields: '*' },
			);
			expect(googleApiRequestAllItemsSpy).not.toHaveBeenCalled();

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('test-file-id');
		});

		it('should handle specific folder trigger for file created', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'fileCreated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			const now = moment().utc();
			const webhookData = { lastTimeChecked: now.clone().subtract(1, 'hour').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			const mockFiles = [
				{
					id: 'new-file-id',
					name: 'New File',
					createdTime: now.format(),
				},
			];

			extractIdSpy.mockReturnValue('test-folder-id');
			googleApiRequestAllItemsSpy.mockResolvedValue(mockFiles);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.stringContaining("'test-folder-id' in parents"),
				}),
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
		});

		it('should filter by file type when specified', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'fileCreated',
					folderToWatch: 'test-folder-id',
					options: { fileType: 'application/vnd.google-apps.document' },
				};
				return params[paramName] ?? '';
			});

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.stringContaining("mimeType = 'application/vnd.google-apps.document'"),
				}),
			);
		});

		it('should handle folder events with folder mime type filter', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'folderCreated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.stringContaining("mimeType = 'application/vnd.google-apps.folder'"),
				}),
			);
		});

		it('should handle watch folder updated event', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'watchFolderUpdated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getWorkflowStaticData.mockReturnValue({
				lastTimeChecked: moment().utc().subtract(1, 'hour').format(),
			});
			const mockFolder = {
				id: 'test-folder-id',
				name: 'Test Folder',
				mimeType: 'application/vnd.google-apps.folder',
				trashed: false,
				modifiedTime: moment().utc().format(),
			};

			extractIdSpy.mockReturnValue('test-folder-id');
			googleApiRequestSpy.mockResolvedValue(mockFolder);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/drive/v3/files/test-folder-id',
				{},
				{ supportsAllDrives: true, fields: '*' },
			);
			expect(googleApiRequestAllItemsSpy).not.toHaveBeenCalled();

			expect(result).toBeDefined();
			expect(result![0][0].json).toEqual(mockFolder);
		});

		it('should use createdTime for Created events and modifiedTime for Updated events', async () => {
			const now = moment().utc();
			const webhookData: IDataObject = {
				lastTimeChecked: now.clone().subtract(1, 'hour').format(),
			};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			// Test fileCreated event uses createdTime
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					triggerOn: 'specificFolder',
					event: 'fileCreated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.stringContaining('createdTime >'),
				}),
			);

			// Reset mock
			googleApiRequestAllItemsSpy.mockClear();

			// Test fileUpdated event uses modifiedTime
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					triggerOn: 'specificFolder',
					event: 'fileUpdated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.stringContaining('modifiedTime >'),
				}),
			);
		});
	});

	describe('Poll Function - Manual Mode', () => {
		beforeEach(() => {
			mockPollFunctions.getMode.mockReturnValue('manual');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					options: {},
				};
				return params[paramName] ?? '';
			});
		});

		it('should fetch single file in manual mode', async () => {
			const mockResponse = {
				files: [
					{
						id: 'test-file-id',
						name: 'Test File',
					},
				],
			};

			googleApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					pageSize: 1,
				}),
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('test-file-id');
		});

		it('should throw NodeApiError when no data found in manual mode', async () => {
			googleApiRequestSpy.mockResolvedValue({ files: [] });

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(NodeApiError);
			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(
				'No data with the current filter could be found',
			);
		});
	});

	describe('Poll Function - State Management', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					options: {},
				};
				return params[paramName] ?? '';
			});
		});

		it('should update lastTimeChecked in webhook data', async () => {
			const mockWebhookData = { lastTimeChecked: moment().subtract(1, 'day').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

			googleApiRequestSpy.mockResolvedValue({
				id: 'test-file-id',
				modifiedTime: '2020-01-01T00:00:00Z',
			});

			await trigger.poll.call(mockPollFunctions);

			expect(mockWebhookData.lastTimeChecked).toBeDefined();
			expect(moment(mockWebhookData.lastTimeChecked).isValid()).toBe(true);
		});

		it('should use current time as startDate when no lastTimeChecked exists', async () => {
			const mockWebhookData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

			googleApiRequestSpy.mockResolvedValue({
				id: 'test-file-id',
				modifiedTime: '2020-01-01T00:00:00Z',
			});

			await trigger.poll.call(mockPollFunctions);

			expect(mockWebhookData.lastTimeChecked).toBeDefined();
			expect(moment(mockWebhookData.lastTimeChecked as string).isValid()).toBe(true);
		});
	});

	describe('Poll Function - Error Handling', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					options: {},
				};
				return params[paramName] ?? '';
			});
		});

		it('should handle API request errors', async () => {
			const apiError = new Error('API Error');
			googleApiRequestSpy.mockRejectedValue(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');
		});

		it('should handle invalid extractId results', async () => {
			extractIdSpy.mockImplementation(() => {
				throw new Error('Invalid ID');
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('Invalid ID');
		});
	});

	describe('Poll Function - Declared Failures', () => {
		const setParameters = (params: Record<string, unknown>) => {
			mockPollFunctions.getNodeParameter.mockImplementation(
				(paramName: string) => params[paramName] ?? '',
			);
		};

		const driveApiError = (statusCode: number, reason?: string) => {
			const requestError = Object.assign(new Error(`${statusCode} - request failed`), {
				statusCode,
				error: {
					error: {
						code: statusCode,
						message: 'request failed',
						...(reason ? { errors: [{ domain: 'usageLimits', reason }] } : {}),
					},
				},
			});
			return new NodeApiError(mockNode, requestError as never);
		};

		const rejectDriveRequests = (error: Error) => {
			googleApiRequestSpy.mockRejectedValue(error);
			googleApiRequestAllItemsSpy.mockRejectedValue(error);
		};

		beforeEach(() => {
			setParameters({
				triggerOn: 'specificFile',
				event: 'fileUpdated',
				fileToWatch: 'test-file-id',
				options: {},
			});
		});

		it.each(['rateLimitExceeded', 'userRateLimitExceeded', 'sharingRateLimitExceeded'])(
			'should declare a 403 with reason %s as rate-limited',
			async (reason) => {
				const apiError = driveApiError(403, reason);
				rejectDriveRequests(apiError);

				await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
				expect(apiError.failure).toEqual({ cause: 'rate-limited' });
				expect(apiError.httpCode).toBe('403');
			},
		);

		it('should declare a 403 with reason dailyLimitExceeded as quota-exhausted, resetting at the next Pacific midnight', async () => {
			const apiError = driveApiError(403, 'dailyLimitExceeded');
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure?.cause).toBe('quota-exhausted');

			const { resetsAtEpochMs } = apiError.failure as { resetsAtEpochMs?: number };
			expect(resetsAtEpochMs).toBeGreaterThan(Date.now());
			expect(moment(resetsAtEpochMs).tz('America/Los_Angeles').format('HH:mm:ss')).toBe('00:00:00');
		});

		it('should declare a 429 as rate-limited', async () => {
			const apiError = driveApiError(429);
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toEqual({ cause: 'rate-limited' });
			expect(apiError.httpCode).toBe('429');
		});

		it('should declare a 403 whose payload is a plain object stored under errorResponse', async () => {
			const apiError = new NodeApiError(mockNode, {
				statusCode: 403,
				error: {
					error: {
						code: 403,
						message: 'request failed',
						errors: [{ domain: 'usageLimits', reason: 'userRateLimitExceeded' }],
					},
				},
			} as never);
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toEqual({ cause: 'rate-limited' });
		});

		it('should declare a 401 as credential-invalid', async () => {
			const apiError = driveApiError(401);
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toEqual({ cause: 'credential-invalid' });
			expect(apiError.httpCode).toBe('401');
		});

		it('should declare a 404 as configuration-invalid when the query filters on the watched folder', async () => {
			setParameters({
				triggerOn: 'specificFolder',
				event: 'fileCreated',
				folderToWatch: 'test-folder-id',
				options: {},
			});
			const apiError = driveApiError(404);
			googleApiRequestAllItemsSpy.mockRejectedValue(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toEqual({ cause: 'configuration-invalid' });
			expect(apiError.message).toBe(
				'The folder this node watches no longer exists. Please update it in the workflow.',
			);
		});

		it('should not declare a 404 when watching any file or folder', async () => {
			setParameters({ triggerOn: 'anyFileFolder', event: 'fileUpdated', options: {} });
			const apiError = driveApiError(404);
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toBeUndefined();
		});

		it.each([
			[
				'a specific file',
				{
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					options: {},
				},
			],
			[
				'a specific folder for updates',
				{
					triggerOn: 'specificFolder',
					event: 'watchFolderUpdated',
					folderToWatch: 'test-folder-id',
					options: {},
				},
			],
		])(
			'should return no items, as the list query did, when the item is missing while watching %s',
			async (_name, params) => {
				setParameters(params);
				rejectDriveRequests(driveApiError(404));

				const result = await trigger.poll.call(mockPollFunctions);

				expect(result).toBeNull();
				expect(googleApiRequestAllItemsSpy).not.toHaveBeenCalled();
			},
		);

		it('should rethrow a 403 with an unrecognized reason unannotated', async () => {
			const apiError = driveApiError(403, 'domainPolicy');
			rejectDriveRequests(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(apiError);
			expect(apiError.failure).toBeUndefined();
		});

		it('should rethrow an error that is not a NodeApiError unannotated', async () => {
			const plainError = new Error('socket hang up');
			rejectDriveRequests(plainError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toBe(plainError);
			expect(plainError).not.toHaveProperty('failure');
		});
	});

	describe('Poll Function - Edge Cases', () => {
		it('should return null when no files found in trigger mode', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			googleApiRequestSpy.mockResolvedValue({
				id: 'test-file-id',
				mimeType: 'application/pdf',
				trashed: false,
				modifiedTime: '2020-01-01T00:00:00Z',
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should handle empty files array', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'fileCreated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should handle files without required fields gracefully', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'fileUpdated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			const mockFiles = [
				{
					id: 'test-file-id',
					// Missing name and other fields
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockFiles);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('test-file-id');
		});

		it('should skip time filtering in manual mode', async () => {
			mockPollFunctions.getMode.mockReturnValue('manual');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'fileCreated',
					folderToWatch: 'test-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			const mockResponse = { files: [{ id: 'test-file', name: 'Test' }] };
			googleApiRequestSpy.mockResolvedValue(mockResponse);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: expect.not.stringMatching(/createdTime|modifiedTime/),
				}),
			);
		});
	});

	describe('Poll Function - Watched Item', () => {
		const lastTimeChecked = '2025-02-21T22:38:46Z';

		const setParameters = (params: Record<string, unknown>) => {
			mockPollFunctions.getNodeParameter.mockImplementation(
				(paramName: string) => params[paramName] ?? '',
			);
		};

		const watchFile = (extra: Record<string, unknown> = {}) =>
			setParameters({ triggerOn: 'specificFile', fileToWatch: 'target-file-id', ...extra });

		const driveFile = (overrides: IDataObject = {}): IDataObject => ({
			kind: 'drive#file',
			id: 'target-file-id',
			name: 'Invoice.pdf',
			mimeType: 'application/pdf',
			trashed: false,
			parents: ['parent-id'],
			createdTime: '2024-01-10T08:00:00.000Z',
			modifiedTime: '2026-10-25T09:00:00.000Z',
			capabilities: { canEdit: true },
			owners: [{ displayName: 'Owner', emailAddress: 'owner@example.com' }],
			...overrides,
		});

		let webhookData: IDataObject;

		beforeEach(() => {
			webhookData = { lastTimeChecked };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
		});

		it('should emit the file as returned by the API when it changed after the checkpoint', async () => {
			watchFile({ event: 'fileUpdated' });
			const file = driveFile();
			googleApiRequestSpy.mockResolvedValue(file);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toEqual([[{ json: file, pairedItem: { item: 0 } }]]);
			expect(webhookData.lastTimeChecked).not.toBe(lastTimeChecked);
		});

		it('should make one request however old the checkpoint is', async () => {
			watchFile({ event: 'fileUpdated' });
			webhookData.lastTimeChecked = '2024-01-01T00:00:00Z';
			googleApiRequestSpy.mockResolvedValue(driveFile());

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
			expect(googleApiRequestAllItemsSpy).not.toHaveBeenCalled();
		});

		it.each([
			['not changed since the checkpoint', { modifiedTime: '2025-02-21T22:38:46.000Z' }],
			['modified before the checkpoint', { modifiedTime: '2024-12-01T00:00:00.000Z' }],
			['trashed', { trashed: true }],
			['a folder', { mimeType: 'application/vnd.google-apps.folder' }],
		])('should emit nothing when the file is %s', async (_name, overrides) => {
			watchFile({ event: 'fileUpdated' });
			googleApiRequestSpy.mockResolvedValue(driveFile(overrides));

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(webhookData.lastTimeChecked).not.toBe(lastTimeChecked);
		});

		it('should compare the created time when the stored event is a created event', async () => {
			watchFile({ event: 'fileCreated' });
			googleApiRequestSpy.mockResolvedValue(driveFile());

			expect(await trigger.poll.call(mockPollFunctions)).toBeNull();

			webhookData.lastTimeChecked = lastTimeChecked;
			googleApiRequestSpy.mockResolvedValue(driveFile({ createdTime: '2026-10-25T08:00:00.000Z' }));

			expect((await trigger.poll.call(mockPollFunctions))![0]).toHaveLength(1);
		});

		it('should emit the watched folder only when it is a folder that changed', async () => {
			setParameters({
				triggerOn: 'specificFolder',
				event: 'watchFolderUpdated',
				folderToWatch: 'target-folder-id',
				options: {},
			});
			const folder = driveFile({
				id: 'target-folder-id',
				mimeType: 'application/vnd.google-apps.folder',
			});
			googleApiRequestSpy.mockResolvedValue(folder);

			expect(await trigger.poll.call(mockPollFunctions)).toEqual([
				[{ json: folder, pairedItem: { item: 0 } }],
			]);

			webhookData.lastTimeChecked = lastTimeChecked;
			googleApiRequestSpy.mockResolvedValue(driveFile({ id: 'target-folder-id' }));

			expect(await trigger.poll.call(mockPollFunctions)).toBeNull();
		});

		it('should not send a request for an ID that no Drive item can have', async () => {
			watchFile({ event: 'fileUpdated', fileToWatch: '../about' });

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(googleApiRequestSpy).not.toHaveBeenCalled();
		});

		it('should keep listing changed files in the watched folder for folder events', async () => {
			setParameters({
				triggerOn: 'specificFolder',
				event: 'fileCreated',
				folderToWatch: 'target-folder-id',
				options: {},
			});
			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).not.toHaveBeenCalled();
			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					q: `trashed = false AND 'target-folder-id' in parents AND mimeType != 'application/vnd.google-apps.folder' AND createdTime > '${lastTimeChecked}'`,
					fields: 'nextPageToken, files(*)',
				}),
			);
		});
	});
});
