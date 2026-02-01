import { mockDeep } from 'jest-mock-extended';
import moment from 'moment-timezone';
import type { IPollFunctions, INode, ILoadOptionsFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { GoogleDriveTrigger } from '../GoogleDriveTrigger.node';
import * as GenericFunctions from '../v1/GenericFunctions';
import * as listSearch from '../v2/methods/listSearch';

jest.mock('../v1/GenericFunctions', () => ({
	extractId: jest.fn(),
	googleApiRequest: jest.fn(),
	googleApiRequestAllItems: jest.fn(),
}));

jest.mock('../v2/methods/listSearch', () => ({
	fileSearch: jest.fn(),
	folderSearch: jest.fn(),
}));

describe('GoogleDriveTrigger', () => {
	let trigger: GoogleDriveTrigger;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockNode: INode;

	const extractIdSpy = jest.spyOn(GenericFunctions, 'extractId');
	const googleApiRequestSpy = jest.spyOn(GenericFunctions, 'googleApiRequest');
	const googleApiRequestAllItemsSpy = jest.spyOn(GenericFunctions, 'googleApiRequestAllItems');

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

		jest.clearAllMocks();

		mockPollFunctions.getNode.mockReturnValue(mockNode);
		mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
		mockPollFunctions.getMode.mockReturnValue('trigger');
		(mockPollFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: unknown[]) =>
			data.map((item: unknown, index: number) => ({ json: item, pairedItem: { item: index } })),
		);
		extractIdSpy.mockImplementation((id) => id);
	});

	afterEach(() => {
		jest.resetAllMocks();
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

			const mockFiles = [
				{
					id: 'test-file-id',
					name: 'Test File',
					modifiedTime: now.format(),
				},
			];

			extractIdSpy.mockReturnValue('test-file-id');
			googleApiRequestAllItemsSpy.mockResolvedValue(mockFiles);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/drive/v3/files',
				{},
				expect.objectContaining({
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
					spaces: 'appDataFolder, drive',
					corpora: 'allDrives',
					q: expect.stringContaining('trashed = false'),
					fields: 'nextPageToken, files(*)',
				}),
			);

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

			const mockFiles = [
				{
					id: 'test-folder-id',
					name: 'Test Folder',
					modifiedTime: moment().utc().format(),
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
					q: expect.not.stringContaining('in parents'),
				}),
			);

			expect(result).toBeDefined();
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

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(mockWebhookData.lastTimeChecked).toBeDefined();
			expect(moment(mockWebhookData.lastTimeChecked).isValid()).toBe(true);
		});

		it('should use current time as startDate when no lastTimeChecked exists', async () => {
			const mockWebhookData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

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
			googleApiRequestAllItemsSpy.mockRejectedValue(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');
		});

		it('should handle invalid extractId results', async () => {
			extractIdSpy.mockImplementation(() => {
				throw new Error('Invalid ID');
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('Invalid ID');
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

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

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
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'test-file-id',
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

	describe('Poll Function - File Filtering', () => {
		it('should filter specific file results correctly', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFile',
					event: 'fileUpdated',
					fileToWatch: 'target-file-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			const mockFiles = [
				{ id: 'target-file-id', name: 'Target File' },
				{ id: 'other-file-id', name: 'Other File' },
			];

			extractIdSpy.mockReturnValue('target-file-id');
			googleApiRequestAllItemsSpy.mockResolvedValue(mockFiles);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('target-file-id');
		});

		it('should filter specific folder results correctly for watchFolderUpdated', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					triggerOn: 'specificFolder',
					event: 'watchFolderUpdated',
					folderToWatch: 'target-folder-id',
					options: {},
				};
				return params[paramName] ?? '';
			});

			const mockFiles = [
				{ id: 'target-folder-id', name: 'Target Folder' },
				{ id: 'other-folder-id', name: 'Other Folder' },
			];

			extractIdSpy.mockReturnValue('target-folder-id');
			googleApiRequestAllItemsSpy.mockResolvedValue(mockFiles);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('target-folder-id');
		});
	});
});
