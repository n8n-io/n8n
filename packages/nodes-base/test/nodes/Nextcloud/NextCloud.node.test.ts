import { NodeOperationError } from 'n8n-workflow';
import { NextCloud } from '../../../nodes/NextCloud/NextCloud.node';
import { nextCloudApiRequest } from '../../../nodes/NextCloud/GenericFunctions';
import { constructExecutionMetaData } from 'n8n-core';
import { status } from '../../../nodes/TheHiveProject/actions/alert';
const nock = require('nock'); // Import nock for HTTP request mocking
function extractJsonValues(nestedArray) {
	return nestedArray.flatMap((innerArray) => innerArray.map((obj) => obj.json));
}
describe('NextCloud Node', () => {
	let node: NextCloud;
	let executeFunctions: any;
	let baseURL = 'https://example.com';

	beforeEach(() => {
		node = new NextCloud();
		executeFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			helpers: {
				requestWithAuthentication: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				prepareBinaryData: jest.fn(),
				constructExecutionMetaData,
			},
			continueOnFail: jest.fn().mockReturnValue(false),
			getInputData: jest.fn().mockReturnValue([]),
			getNode: jest.fn(),
		};
	});
	describe('Deck Operations', () => {
		it('should create a new Deck board', async () => {
			const boardName = 'Project Management';
			const boardColor = '#FFFFFF'; // Example color

			const actualResponse = {
				title: boardName,
				owner: {
					primaryKey: 'admin',
					uid: 'admin',
					displayname: 'Administrator',
				},
				color: boardColor.replace('#', ''),
				archived: false,
				labels: [
					{
						title: 'Finished',
						color: '31CC7C',
						boardId: 10,
						cardId: null,
						id: 37,
					},
					{
						title: 'To review',
						color: '317CCC',
						boardId: 10,
						cardId: null,
						id: 38,
					},
					{
						title: 'Action needed',
						color: 'FF7A66',
						boardId: 10,
						cardId: null,
						id: 39,
					},
					{
						title: 'Later',
						color: 'F1DB50',
						boardId: 10,
						cardId: null,
						id: 40,
					},
				],
				acl: [],
				permissions: {
					PERMISSION_READ: true,
					PERMISSION_EDIT: true,
					PERMISSION_MANAGE: true,
					PERMISSION_SHARE: true,
				},
				users: [],
				deletedAt: 0,
				id: 10,
				lastModified: 1586269585,
			};
			const mockResponse = actualResponse;

			// Mock the nextCloudApiRequest to simulate API behavior
			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'deck',
					operation: 'createBoard',
					boardName,
					boardColor,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'deck',
							operation: 'createBoard',
							boardName,
							boardColor,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
		});
		it('should retrieve all Deck boards', async () => {
			const actualResponse = [
				{
					id: 3,
					title: 'test',
					owner: {
						primaryKey: 'abdullah',
						uid: 'abdullah',
						displayname: 'abdullah',
						type: 0,
					},
					color: 'e3fbca',
					archived: false,
					labels: [],
					acl: [],
					permissions: {
						PERMISSION_READ: true,
						PERMISSION_EDIT: true,
						PERMISSION_MANAGE: true,
						PERMISSION_SHARE: true,
					},
					users: [],
					shared: 0,
					stacks: [],
					activeSessions: [],
					deletedAt: 0,
					lastModified: 1729851629,
					settings: [],
					ETag: '3780486f697566ca8305caf259b8b747',
				},
				{
					id: 4,
					title: 'new',
					owner: {
						primaryKey: 'abdullah',
						uid: 'abdullah',
						displayname: 'abdullah',
						type: 0,
					},
					color: 'FFFFFF',
					archived: false,
					labels: [],
					acl: [],
					permissions: {
						PERMISSION_READ: true,
						PERMISSION_EDIT: true,
						PERMISSION_MANAGE: true,
						PERMISSION_SHARE: true,
					},
					users: [],
					shared: 0,
					stacks: [],
					activeSessions: [],
					deletedAt: 0,
					lastModified: 1729881508,
					settings: [],
					ETag: 'a1bbaf8e108c564ed0d3e138f3e7a2d0',
				},
				{
					id: 8,
					title: 'n',
					owner: {
						primaryKey: 'abdullah',
						uid: 'abdullah',
						displayname: 'abdullah',
						type: 0,
					},
					color: '480B0B',
					archived: false,
					labels: [],
					acl: [],
					permissions: {
						PERMISSION_READ: true,
						PERMISSION_EDIT: true,
						PERMISSION_MANAGE: true,
						PERMISSION_SHARE: true,
					},
					users: [],
					shared: 0,
					stacks: [],
					activeSessions: [],
					deletedAt: 1730280784,
					lastModified: 1730280784,
					settings: [],
					ETag: '28802fd52732d30479e909e707ea34f3',
				},
			];
			const mockResponse = actualResponse;
			const requestSpy = jest
				.spyOn(nextCloudApiRequest, 'call')
				.mockResolvedValue(JSON.stringify(mockResponse));

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'deck',
					operation: 'getBoards',
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'deck',
							operation: 'getBoards',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
			requestSpy.mockRestore();
		});

		it('should update a Deck board', async () => {
			const boardId = '12345';
			const newName = 'Updated Project Management';
			const boardColor = '#FF0000'; // New color
			const archived = false; // Archive status
			const expectedUrl = `/index.php/apps/deck/api/v1.0/boards/${encodeURIComponent(boardId)}`;
			const expectedBody = {
				title: newName,
				color: boardColor.replace('#', ''),
				archived: archived,
			};
			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'deck',
					operation: 'updateBoard',
					boardId,
					boardName: newName,
					boardColor,
					archivedBoard: archived,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'deck',
							operation: 'updateBoard',
						},
					},
				],
			]);

			// Mock response for the nextCloudApiRequest
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(
				JSON.stringify({
					ocs: {
						meta: { status: 'ok' },
					},
				}),
			);

			// Execute the node function
			const result = await node.execute.call(executeFunctions);
			console.log('-----------', result);
			// Since the response is just a success status, we check for an empty success response
			// expect(result[0][1].json).ocs.meta).toEqual({ status: 'ok' });
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
		});
		it('should delete a Deck board', async () => {
			const boardId = '12345';

			const mockResponse = {
				title: 'string',
				owner: {
					primaryKey: 'admin',
					uid: 'admin',
					displayname: 'Administrator',
				},
				color: 'string',
				archived: false,
				labels: [
					{
						title: 'Finished',
						color: '31CC7C',
						boardId: boardId,
						cardId: null,
						id: 37,
					},
					{
						title: 'To review',
						color: '317CCC',
						boardId: boardId,
						cardId: null,
						id: 38,
					},
					{
						title: 'Action needed',
						color: 'FF7A66',
						boardId: boardId,
						cardId: null,
						id: 39,
					},
					{
						title: 'Later',
						color: 'F1DB50',
						boardId: boardId,
						cardId: null,
						id: 40,
					},
				],
				acl: [],
				permissions: {
					PERMISSION_READ: true,
					PERMISSION_EDIT: true,
					PERMISSION_MANAGE: true,
					PERMISSION_SHARE: true,
				},
				users: [],
				deletedAt: 0,
				id: boardId,
				lastModified: 1586269585,
			};

			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(JSON.stringify(mockResponse));

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'deck',
					operation: 'deleteBoard',
					boardId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'deck',
							operation: 'deleteBoard',
						},
					},
				],
			]);
			const result = await node.execute.call(executeFunctions);

			expect(extractJsonValues(result)).toEqual([mockResponse]);
		});
	});
	describe('Notes Operations', () => {
		it('should create a new Note', async () => {
			const noteTitle = 'Meeting notes';
			const noteContent = 'These are the meeting notes.';
			const noteCategory = 'Work';

			const actualResponse = {
				id: 1141,
				title: 'New note',
				modified: 1730119566,
				category: 'no',
				favorite: false,
				readonly: false,
				internalPath: '/Notes/no/New note.md',
				shareTypes: [],
				isShared: false,
				error: false,
				errorType: '',
				content: 'hiho',
				etag: '1f866cd7799ecbf151c11230f3fac969',
			};

			const mockResponse = actualResponse;

			// Mock the nextCloudApiRequest to simulate API behavior
			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'createNote',
					content: noteContent,
					noteCategory: noteCategory,
					noteTitle: noteTitle,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'createNote',
						},
					},
				],
			]);
			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
		});

		it('should retrieve all Notes', async () => {
			const actualResponse = [
				{
					id: 1070,
					title: 'testing',
					modified: 1729851805,
					category: '',
					favorite: false,
					readonly: false,
					internalPath: '/Notes/testing.md',
					shareTypes: [],
					isShared: false,
					error: false,
					errorType: '',
					content: 'testing',
					etag: '1630b41cf50ec6b784a9e5ffe0e9a00b',
				},
				{
					id: 1123,
					title: 'New note',
					modified: 1729883428,
					category: 'new',
					favorite: false,
					readonly: false,
					internalPath: '/Notes/new/New note.md',
					shareTypes: [],
					isShared: false,
					error: false,
					errorType: '',
					content: 'edited',
					etag: 'bdaa61d06ff18b05796a24ead48f549b',
				},
				{
					id: 1138,
					title: 'New note',
					modified: 1730119531,
					category: '',
					favorite: false,
					readonly: false,
					internalPath: '/Notes/New note.md',
					shareTypes: [],
					isShared: false,
					error: false,
					errorType: '',
					content: '\\\\ how areu',
					etag: 'ddf6e8cb013a35e66d823769e04b0424',
				},
				{
					id: 1141,
					title: 'New note',
					modified: 1730119566,
					category: 'no',
					favorite: false,
					readonly: false,
					internalPath: '/Notes/no/New note.md',
					shareTypes: [],
					isShared: false,
					error: false,
					errorType: '',
					content: 'hiho',
					etag: '1f866cd7799ecbf151c11230f3fac969',
				},
			];

			const mockResponse = actualResponse;

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'getNotes',
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'getNotes',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
			requestSpy.mockRestore();
		});

		it('should retrieve a single Note', async () => {
			const noteId = '12345';
			const actualResponse = {
				id: noteId,
				title: 'Meeting notes',
				content: 'These are the meeting notes.',
				category: 'Work',
				modified: 1626269585,
			};

			const mockResponse = actualResponse;

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'getNote',
					noteId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'getNote',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});

		it('should update an existing Note', async () => {
			const noteId = '12345';
			const updatedContent = 'Updated meeting notes.';
			const expectedUrl = `index.php/apps/notes/api/v1/notes/${encodeURIComponent(noteId)}`;
			const expectedBody = { content: updatedContent };
			const mockResponse = {
				id: noteId,
				title: 'edited note',
				modified: 1730119566,
				category: 'no',
				favorite: false,
				readonly: false,
				internalPath: '/Notes/no/New note.md',
				shareTypes: [],
				isShared: false,
				error: false,
				errorType: '',
				content: updatedContent,
				etag: '1f866cd7799ecbf151c11230f3fac969',
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'updateNote',
					noteId,
					content: updatedContent,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'updateNote',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([mockResponse]);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
		});

		it('should delete a Note', async () => {
			const noteId = '12345';

			const mockResponse = {
				id: noteId,
				title: 'deleted note',
				modified: 1730119566,
				category: 'no',
				favorite: false,
				readonly: false,
				internalPath: '/Notes/no/New note.md',
				shareTypes: [],
				isShared: false,
				error: false,
				errorType: '',
				content: 'gone...',
				etag: '1f866cd7799ecbf151c11230f3fac969',
			};

			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'deleteNote',
					noteId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'deleteNote',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([mockResponse]);
		});
	});
	describe('Tables Operations', () => {
		it('should create a new Table', async () => {
			const tableName = 'Project Management';

			const actualResponse = {
				id: 0,
				title: tableName,
				emoji: 'string',
				ownership: 'string',
				ownerDisplayName: 'string',
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				archived: true,
				favorite: true,
				isShared: true,
				onSharePermissions: {
					read: true,
					create: true,
					update: true,
					delete: true,
					manage: true,
				},
				hasShares: true,
				rowsCount: 0,
				views: [
					{
						id: 0,
						title: 'string',
						emoji: 'string',
						tableId: 0,
						ownership: 'string',
						ownerDisplayName: 'string',
						createdBy: 'string',
						createdAt: 'string',
						lastEditBy: 'string',
						lastEditAt: 'string',
						description: 'string',
						columns: [0],
						sort: [
							{
								columnId: 0,
								mode: 'ASC',
							},
						],
						filter: [
							[
								{
									columnId: 0,
									operator: 'begins-with',
									value: 'string',
								},
							],
						],
						isShared: true,
						favorite: true,
						onSharePermissions: {
							read: true,
							create: true,
							update: true,
							delete: true,
							manage: true,
						},
						hasShares: true,
						rowsCount: 0,
					},
				],
				columnsCount: 0,
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'createTable',
					tableName,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'createTable',
							tableName,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
		});
		it('should retrieve all Tables', async () => {
			const actualResponse = [
				{
					id: '27',
					title: 'title',
					emoji: '',
					ownership: 'abdullah',
					ownerDisplayName: 'abdullah',
					createdBy: 'abdullah',
					createdAt: '2024-10-25 20:39:47',
					lastEditBy: 'abdullah',
					lastEditAt: '2024-10-25 20:39:47',
					archived: '',
					isShared: '',
					favorite: '',
					onSharePermissions: '',
					hasShares: '',
					rowsCount: '0',
					columnsCount: '0',
					views: '',
					description: '',
				},
			];

			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};
			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getTables',
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getTables',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
		});
		it('should retrieve a single Table', async () => {
			const tableId = '12345';
			const actualResponse = {
				id: tableId,
				title: 'string',
				emoji: 'string',
				ownership: 'string',
				ownerDisplayName: 'string',
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				archived: true,
				favorite: true,
				isShared: true,
				onSharePermissions: {
					read: true,
					create: true,
					update: true,
					delete: true,
					manage: true,
				},
				hasShares: true,
				rowsCount: 0,
				views: [
					{
						id: 0,
						title: 'string',
						emoji: 'string',
						tableId: 0,
						ownership: 'string',
						ownerDisplayName: 'string',
						createdBy: 'string',
						createdAt: 'string',
						lastEditBy: 'string',
						lastEditAt: 'string',
						description: 'string',
						columns: [0],
						sort: [
							{
								columnId: 0,
								mode: 'ASC',
							},
						],
						filter: [
							[
								{
									columnId: 0,
									operator: 'begins-with',
									value: 'string',
								},
							],
						],
						isShared: true,
						favorite: true,
						onSharePermissions: {
							read: true,
							create: true,
							update: true,
							delete: true,
							manage: true,
						},
						hasShares: true,
						rowsCount: 0,
					},
				],
				columnsCount: 0,
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getTable',
					tableId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getTable',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should update an existing Table', async () => {
			const tableId = '12345';
			const tableName = 'Updated Table.';
			const archivedTable = true;
			const expectedUrl = `/ocs/v2.php/apps/tables/api/2/tables/${encodeURIComponent(tableId)}`;
			const expectedBody = { title: tableName, archived: archivedTable };
			const actualResponse = {
				id: tableId,
				title: tableName,
				emoji: 'string',
				ownership: 'string',
				ownerDisplayName: 'string',
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				archived: archivedTable,
				favorite: true,
				isShared: true,
				onSharePermissions: {
					read: true,
					create: true,
					update: true,
					delete: true,
					manage: true,
				},
				hasShares: true,
				rowsCount: 0,
				views: [
					{
						id: 0,
						title: 'string',
						emoji: 'string',
						tableId: 0,
						ownership: 'string',
						ownerDisplayName: 'string',
						createdBy: 'string',
						createdAt: 'string',
						lastEditBy: 'string',
						lastEditAt: 'string',
						description: 'string',
						columns: [0],
						sort: [
							{
								columnId: 0,
								mode: 'ASC',
							},
						],
						filter: [
							[
								{
									columnId: 0,
									operator: 'begins-with',
									value: 'string',
								},
							],
						],
						isShared: true,
						favorite: true,
						onSharePermissions: {
							read: true,
							create: true,
							update: true,
							delete: true,
							manage: true,
						},
						hasShares: true,
						rowsCount: 0,
					},
				],
				columnsCount: 0,
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'updateTable',
					tableId: tableId,
					tableName: tableName,
					archivedTable: archivedTable,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/tables/api/2/tables/${encodeURIComponent(tableId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'updateTable',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);

			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
		});

		it('should delete a table', async () => {
			const tableId = '12345';
			const actualResponse = {
				id: tableId,
				title: 'string',
				emoji: 'string',
				ownership: 'string',
				ownerDisplayName: 'string',
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				archived: true,
				favorite: true,
				isShared: true,
				onSharePermissions: {
					read: true,
					create: true,
					update: true,
					delete: true,
					manage: true,
				},
				hasShares: true,
				rowsCount: 0,
				views: [
					{
						id: 0,
						title: 'string',
						emoji: 'string',
						tableId: 0,
						ownership: 'string',
						ownerDisplayName: 'string',
						createdBy: 'string',
						createdAt: 'string',
						lastEditBy: 'string',
						lastEditAt: 'string',
						description: 'string',
						columns: [0],
						sort: [
							{
								columnId: 0,
								mode: 'ASC',
							},
						],
						filter: [
							[
								{
									columnId: 0,
									operator: 'begins-with',
									value: 'string',
								},
							],
						],
						isShared: true,
						favorite: true,
						onSharePermissions: {
							read: true,
							create: true,
							update: true,
							delete: true,
							manage: true,
						},
						hasShares: true,
						rowsCount: 0,
					},
				],
				columnsCount: 0,
			};
			const mockResponse = actualResponse;

			jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'notes',
					operation: 'deleteNote',
					tableId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'notes',
							operation: 'deleteNote',
							tableId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
		});
		it('should retrieve all columns of a Table', async () => {
			const tableId = '12345';
			const actualResponse = [
				{
					id: 0,
					title: 'string',
					tableId: tableId,
					createdBy: 'string',
					createdAt: 'string',
					lastEditBy: 'string',
					lastEditAt: 'string',
					type: 'string',
					subtype: 'string',
					mandatory: true,
					description: 'string',
					orderWeight: 0,
					numberDefault: 0,
					numberMin: 0,
					numberMax: 0,
					numberDecimals: 0,
					numberPrefix: 'string',
					numberSuffix: 'string',
					textDefault: 'string',
					textAllowedPattern: 'string',
					textMaxLength: 0,
					selectionOptions: 'string',
					selectionDefault: 'string',
					datetimeDefault: 'string',
					usergroupDefault: 'string',
					usergroupMultipleItems: true,
					usergroupSelectUsers: true,
					usergroupSelectGroups: true,
					showUserStatus: true,
				},
			];
			const mockResponse = actualResponse;
			const requestSpy = jest
				.spyOn(nextCloudApiRequest, 'call')
				.mockResolvedValue(JSON.stringify(mockResponse));

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getColumns',
					tableId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getRows',
							tableId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
		});
		it('should retrieve a single column', async () => {
			const columnId = '67890';
			const actualResponse = {
				id: columnId,
				title: 'string',
				tableId: 0,
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				type: 'string',
				subtype: 'string',
				mandatory: true,
				description: 'string',
				orderWeight: 0,
				numberDefault: 0,
				numberMin: 0,
				numberMax: 0,
				numberDecimals: 0,
				numberPrefix: 'string',
				numberSuffix: 'string',
				textDefault: 'string',
				textAllowedPattern: 'string',
				textMaxLength: 0,
				selectionOptions: 'string',
				selectionDefault: 'string',
				datetimeDefault: 'string',
				usergroupDefault: 'string',
				usergroupMultipleItems: true,
				usergroupSelectUsers: true,
				usergroupSelectGroups: true,
				showUserStatus: true,
			};

			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getColumn',
					columnId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getColumn',
							columnId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should delete a column', async () => {
			const columnId = '12345';
			const actualResponse = {
				id: columnId,
				title: 'string',
				tableId: 0,
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				type: 'string',
				subtype: 'string',
				mandatory: true,
				description: 'string',
				orderWeight: 0,
				numberDefault: 0,
				numberMin: 0,
				numberMax: 0,
				numberDecimals: 0,
				numberPrefix: 'string',
				numberSuffix: 'string',
				textDefault: 'string',
				textAllowedPattern: 'string',
				textMaxLength: 0,
				selectionOptions: 'string',
				selectionDefault: 'string',
				datetimeDefault: 'string',
				usergroupDefault: 'string',
				usergroupMultipleItems: true,
				usergroupSelectUsers: true,
				usergroupSelectGroups: true,
				showUserStatus: true,
			};
			const mockResponse = actualResponse;

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'deleteColumn',
					columnId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'deleteColumn',
							columnId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should update an existing Column', async () => {
			const columnId = '12345';
			const columnTitle = 'Updated Column.';
			const columnDescription = 'Updated Column Description.';
			const mandatoryColumn = true;
			const columnType = 'text';
			const textDefault = 'Added textDefault';
			const textAllowedPattern = 'Added textAllowedPattern';
			const textMaxLength = 100;
			const columnSubType = 'line';
			const expectedBody = {
				title: columnTitle,
				description: columnDescription,
				mandatory: mandatoryColumn,
				subtype: columnSubType,
				textDefault: textDefault,
				textAllowedPattern: textAllowedPattern,
				textMaxLength: textMaxLength,
			};
			const expectedUrl = `/index.php/apps/tables/api/1/columns/${encodeURIComponent(columnId)}`;

			const actualResponse = {
				id: columnId,
				title: columnTitle,
				tableId: 0,
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				type: columnType,
				subtype: columnSubType,
				mandatory: mandatoryColumn,
				description: columnDescription,
				orderWeight: 0,
				numberDefault: 0,
				numberMin: 0,
				numberMax: 0,
				numberDecimals: 0,
				numberPrefix: 'string',
				numberSuffix: 'string',
				textDefault: textDefault,
				textAllowedPattern: textAllowedPattern,
				textMaxLength: textMaxLength,
				selectionOptions: 'string',
				selectionDefault: 'string',
				datetimeDefault: 'string',
				usergroupDefault: 'string',
				usergroupMultipleItems: true,
				usergroupSelectUsers: true,
				usergroupSelectGroups: true,
				showUserStatus: true,
			};
			const mockResponse = actualResponse;
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'updateColumn',
					columnId,
					columnTitle,
					columnDescription,
					mandatoryColumn,
					columnType,
					textDefault,
					textAllowedPattern,
					textMaxLength,
					columnSubType,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/index.php/apps/tables/api/1/columns/${encodeURIComponent(columnId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'updateColumn',
							columnId,
							columnTitle,
							columnDescription,
							mandatoryColumn,
							columnType,
							textDefault,
							textAllowedPattern,
							textMaxLength,
							columnSubType,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);

			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
			requestSpy.mockRestore();
		});
		it('should create a new Column', async () => {
			const tableId = '12345';
			const columnTitle = 'Updated Column.';
			const columnDescription = 'Updated Column Description.';
			const mandatoryColumn = true;
			const columnType = 'text';
			const textDefault = 'Added textDefault';
			const textAllowedPattern = 'Added textAllowedPattern';
			const textMaxLength = 100;
			const columnSubType = 'line';
			const expectedBody = {
				tableId,
				title: columnTitle,
				description: columnDescription,
				mandatory: mandatoryColumn,
				subtype: columnSubType,
				type: columnType,
				textDefault,
				textAllowedPattern,
				textMaxLength,
			};
			const expectedUrl = '/index.php/apps/tables/api/1/columns';
			const actualResponse = {
				tableId,
				viewId: 0,
				title: columnTitle,
				type: columnType,
				subtype: columnSubType,
				mandatory: mandatoryColumn,
				description: columnDescription,
				numberPrefix: 'string',
				numberSuffix: 'string',
				numberDefault: 0,
				numberMin: 0,
				numberMax: 0,
				numberDecimals: 0,
				textDefault,
				textAllowedPattern,
				textMaxLength,
				selectionOptions: '',
				selectionDefault: '',
				datetimeDefault: '',
				usergroupDefault: '',
				usergroupMultipleItems: true,
				usergroupSelectUsers: true,
				usergroupSelectGroups: true,
				usergroupShowUserStatus: true,
				selectedViewIds: [],
			};
			const mockResponse = actualResponse;

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'createColumn',
					tableId,
					columnTitle,
					columnDescription,
					mandatoryColumn,
					columnType,
					textDefault,
					textAllowedPattern,
					textMaxLength,
					columnSubType,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'createColumn',
							tableId,
							columnTitle,
							columnDescription,
							mandatoryColumn,
							columnType,
							textDefault,
							textAllowedPattern,
							textMaxLength,
							columnSubType,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('POST');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);

			requestSpy.mockRestore();
		});
		it('should retrieve all rows of a Table', async () => {
			const tableId = '12345';
			const actualResponse = [
				{
					id: 0,
					tableId,
					createdBy: 'string',
					createdAt: 'string',
					lastEditBy: 'string',
					lastEditAt: 'string',
					data: {
						columnId: 0,
						value: {},
					},
				},
			];
			const mockResponse = actualResponse;
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getRows',
					tableId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getRows',
							tableId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
		});
		it('should retrieve a single row', async () => {
			const rowId = '67890';
			const actualResponse = {
				id: rowId,
				tableId: 0,
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				data: {
					columnId: 0,
					value: {},
				},
			};

			const mockResponse = actualResponse;

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'getRow',
					rowId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'getRow',
							rowId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should delete a row', async () => {
			const rowId = '12345';
			const actualResponse = {
				id: rowId,
				tableId: 0,
				createdBy: 'string',
				createdAt: 'string',
				lastEditBy: 'string',
				lastEditAt: 'string',
				data: {
					columnId: 0,
					value: {},
				},
			};
			const mockResponse = actualResponse;

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'deleteColumn',
					rowId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'deleteRow',
							rowId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should update an existing Row', async () => {
			const rowId = '12345';
			const data = 'Updated row data';

			const expectedBody = {
				data,
			};
			const expectedUrl = `/index.php/apps/tables/api/1/rows/${encodeURIComponent(rowId)}`;

			const actualResponse = {
				viewId: 0,
				data,
			};
			const mockResponse = actualResponse;
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'updateRow',
					rowId,
					rowData: data,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v1.php/apps/tables/api/1/rows/${encodeURIComponent(rowId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'updateColumn',
							rowId,
							rowData: data,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);

			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
			requestSpy.mockRestore();
		});
		it('should create a new Row', async () => {
			const tableId = '12345';
			const data = 'Row data';
			const expectedBody = {
				data,
			};
			const expectedUrl = `/index.php/apps/tables/api/1/tables/${encodeURIComponent(tableId)}/rows`;
			const actualResponse = {
				data,
			};
			const mockResponse = actualResponse;

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'tables',
					operation: 'createRow',
					tableId,
					rowData: data,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'tables',
							operation: 'createColumn',
							tableId,
							rowData: data,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('POST');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);

			requestSpy.mockRestore();
		});
	});
	describe('Talk Operations', () => {
		// it('should retrieve all messages in a Talk room', async () => {
		// 	const conversationId = '12345';
		// 	const actualResponse = [
		// 		{
		// 			id: 1,
		// 			token: conversationId,
		// 			actorType: 'user',
		// 			actorId: 'user_001',
		// 			actorDisplayName: 'John Doe',
		// 			timestamp: 1698136800,
		// 			systemMessage: '',
		// 			messageType: 'comment',
		// 			isReplyable: true,
		// 			referenceId: 'ref_001',
		// 			message: 'Hello, this is a message!',
		// 			messageParameters: [],
		// 			expirationTimestamp: 1698223200,
		// 			parent: [],
		// 			reactions: [2, 5, 0],
		// 			reactionsSelf: ['👍', '❤️'],
		// 			markdown: true,
		// 			lastEditActorType: '',
		// 			lastEditActorId: '',
		// 			lastEditActorDisplayName: '',
		// 			lastEditTimestamp: 0,
		// 			silent: false,
		// 		},
		// 	];
		// 	const mockResponse = {
		// 		ocs: {
		// 			meta: { status: 'ok' },
		// 			data: actualResponse,
		// 		},
		// 	};
		// 	jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(JSON.stringify(mockResponse));

		// 	executeFunctions.getNodeParameter.mockImplementation((param) => {
		// 		const params = {
		// 			authentication: 'accessToken',
		// 			resource: 'talk',
		// 			operation: 'getMessages',
		// 		};
		// 		return params[param];
		// 	});

		// 	executeFunctions.getCredentials.mockResolvedValue({
		// 		webDavUrl: 'https://example.com',
		// 	});

		// 	executeFunctions.getInputData.mockReturnValue([
		// 		[
		// 			{
		// 				json: {
		// 					authentication: 'accessToken',
		// 					resource: 'talk',
		// 					operation: 'getMessages',
		// 				},
		// 			},
		// 		],
		// 	]);

		// 	const result = await node.execute.call(executeFunctions);
		// 	expect(JSON.parse(result[0][1].json).ocs.data).toEqual(actualResponse);
		// });
		it('should retrieve a message context', async () => {
			const conversationId = '67890';
			// const actualResponse = {
			// 	id: 1,
			// 	token: conversationId,
			// 	actorType: 'user',
			// 	actorId: 'user_001',
			// 	actorDisplayName: 'John Doe',
			// 	timestamp: 1698136800,
			// 	systemMessage: '',
			// 	messageType: 'comment',
			// 	isReplyable: true,
			// 	referenceId: 'ref_001',
			// 	message: 'Hello, this is a message!',
			// 	messageParameters: [],
			// 	expirationTimestamp: 1698223200,
			// 	parent: [],
			// 	reactions: [2, 5, 0],
			// 	reactionsSelf: ['👍', '❤️'],
			// 	markdown: true,
			// 	lastEditActorType: '',
			// 	lastEditActorId: '',
			// 	lastEditActorDisplayName: '',
			// 	lastEditTimestamp: 0,
			// 	silent: false,
			// };
			const actualResponse = [
				{
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: 0,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: 'string',
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
					parent: {
						actorDisplayName: 'string',
						actorId: 'string',
						actorType: 'string',
						expirationTimestamp: 0,
						message: 'string',
						messageParameters: {
							property1: {
								type: 'string',
								id: 'string',
								name: 'string',
								server: 'string',
								link: 'string',
								'call-type': 'one2one',
								'icon-url': 'string',
								'message-id': 'string',
								boardname: 'string',
								stackname: 'string',
								size: 'string',
								path: 'string',
								mimetype: 'string',
								'preview-available': 'yes',
								mtime: 'string',
								latitude: 'string',
								longitude: 'string',
								description: 'string',
								thumb: 'string',
								website: 'string',
								visibility: '0',
								assignable: '0',
								conversation: 'string',
								etag: 'string',
								permissions: 'string',
								width: 'string',
								height: 'string',
								blurhash: 'string',
							},
							property2: {
								type: 'string',
								id: 'string',
								name: 'string',
								server: 'string',
								link: 'string',
								'call-type': 'one2one',
								'icon-url': 'string',
								'message-id': 'string',
								boardname: 'string',
								stackname: 'string',
								size: 'string',
								path: 'string',
								mimetype: 'string',
								'preview-available': 'yes',
								mtime: 'string',
								latitude: 'string',
								longitude: 'string',
								description: 'string',
								thumb: 'string',
								website: 'string',
								visibility: '0',
								assignable: '0',
								conversation: 'string',
								etag: 'string',
								permissions: 'string',
								width: 'string',
								height: 'string',
								blurhash: 'string',
							},
						},
						messageType: 'string',
						systemMessage: 'string',
						deleted: true,
						id: 0,
						isReplyable: true,
						markdown: true,
						reactions: {
							property1: 0,
							property2: 0,
						},
						reactionsSelf: ['string'],
						referenceId: 'string',
						timestamp: 0,
						token: 'string',
						lastEditActorDisplayName: 'string',
						lastEditActorId: 'string',
						lastEditActorType: 'string',
						lastEditTimestamp: 0,
						silent: true,
					},
				},
			];
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'getMessageContext',
					conversationId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com',
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'getMessageContext',
							conversationId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
			requestSpy.mockRestore();
		});
		it('should send a new Message', async () => {
			const conversationId = '12345';
			const message = 'message text';
			const actorDisplayName = 'Display name';
			const replyTo = '88888';
			const referenceId = 'abcd';
			const silent = false;
			const expectedBody = {
				message,
				actorDisplayName,
				replyTo,
				referenceId,
				silent,
			};
			const expectedUrl = `/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(conversationId)}`;
			const actualResponse = {
				id: 1,
				token: conversationId,
				actorType: 'user',
				actorId: 'user_001',
				actorDisplayName: 'John Doe',
				timestamp: 1698136800,
				systemMessage: '',
				messageType: 'comment',
				isReplyable: true,
				referenceId: 'ref_001',
				message: 'Hello, this is a message!',
				messageParameters: [],
				expirationTimestamp: 1698223200,
				parent: [],
				reactions: [2, 5, 0],
				reactionsSelf: ['👍', '❤️'],
				markdown: true,
				lastEditActorType: '',
				lastEditActorId: '',
				lastEditActorDisplayName: '',
				lastEditTimestamp: 0,
				silent: false,
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'sendMessage',
					conversationId,
					message,
					actorDisplayName,
					replyTo,
					referenceId,
					silent,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'sendMessage',
							conversationId,
							message,
							actorDisplayName,
							replyTo,
							referenceId,
							silent,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('POST');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);

			requestSpy.mockRestore();
		});
		it('should update an existing message', async () => {
			const conversationId = '12345';
			const messageId = '67890';
			const message = 'updated message text';

			const expectedBody = {
				message,
			};
			const expectedUrl = `/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`;

			const actualResponse = {
				actorDisplayName: 'string',
				actorId: 'string',
				actorType: 'string',
				expirationTimestamp: 0,
				message: 'string',
				messageParameters: {
					property1: {
						type: 'string',
						id: 'string',
						name: 'string',
						server: 'string',
						link: 'string',
						'call-type': 'one2one',
						'icon-url': 'string',
						'message-id': 'string',
						boardname: 'string',
						stackname: 'string',
						size: 'string',
						path: 'string',
						mimetype: 'string',
						'preview-available': 'yes',
						mtime: 'string',
						latitude: 'string',
						longitude: 'string',
						description: 'string',
						thumb: 'string',
						website: 'string',
						visibility: '0',
						assignable: '0',
						conversation: 'string',
						etag: 'string',
						permissions: 'string',
						width: 'string',
						height: 'string',
						blurhash: 'string',
					},
					property2: {
						type: 'string',
						id: 'string',
						name: 'string',
						server: 'string',
						link: 'string',
						'call-type': 'one2one',
						'icon-url': 'string',
						'message-id': 'string',
						boardname: 'string',
						stackname: 'string',
						size: 'string',
						path: 'string',
						mimetype: 'string',
						'preview-available': 'yes',
						mtime: 'string',
						latitude: 'string',
						longitude: 'string',
						description: 'string',
						thumb: 'string',
						website: 'string',
						visibility: '0',
						assignable: '0',
						conversation: 'string',
						etag: 'string',
						permissions: 'string',
						width: 'string',
						height: 'string',
						blurhash: 'string',
					},
				},
				messageType: 'string',
				systemMessage: 'string',
				deleted: true,
				id: 0,
				isReplyable: true,
				markdown: true,
				reactions: {
					property1: 0,
					property2: 0,
				},
				reactionsSelf: ['string'],
				referenceId: 'string',
				timestamp: 0,
				token: conversationId,
				lastEditActorDisplayName: 'string',
				lastEditActorId: 'string',
				lastEditActorType: 'string',
				lastEditTimestamp: 0,
				silent: true,
				parent: {
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: messageId,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: conversationId,
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
				},
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'updateMessage',
					conversationId,
					messageId,
					message,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'updateMessage',
							conversationId,
							messageId,
							message,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);

			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);
			requestSpy.mockRestore();
		});
		it('should delete a message', async () => {
			const conversationId = '12345';
			const messageId = '67890';
			const actualResponse = {
				actorDisplayName: 'string',
				actorId: 'string',
				actorType: 'string',
				expirationTimestamp: 0,
				message: 'string',
				messageParameters: {
					property1: {
						type: 'string',
						id: 'string',
						name: 'string',
						server: 'string',
						link: 'string',
						'call-type': 'one2one',
						'icon-url': 'string',
						'message-id': 'string',
						boardname: 'string',
						stackname: 'string',
						size: 'string',
						path: 'string',
						mimetype: 'string',
						'preview-available': 'yes',
						mtime: 'string',
						latitude: 'string',
						longitude: 'string',
						description: 'string',
						thumb: 'string',
						website: 'string',
						visibility: '0',
						assignable: '0',
						conversation: 'string',
						etag: 'string',
						permissions: 'string',
						width: 'string',
						height: 'string',
						blurhash: 'string',
					},
					property2: {
						type: 'string',
						id: 'string',
						name: 'string',
						server: 'string',
						link: 'string',
						'call-type': 'one2one',
						'icon-url': 'string',
						'message-id': 'string',
						boardname: 'string',
						stackname: 'string',
						size: 'string',
						path: 'string',
						mimetype: 'string',
						'preview-available': 'yes',
						mtime: 'string',
						latitude: 'string',
						longitude: 'string',
						description: 'string',
						thumb: 'string',
						website: 'string',
						visibility: '0',
						assignable: '0',
						conversation: 'string',
						etag: 'string',
						permissions: 'string',
						width: 'string',
						height: 'string',
						blurhash: 'string',
					},
				},
				messageType: 'string',
				systemMessage: 'string',
				deleted: true,
				id: 0,
				isReplyable: true,
				markdown: true,
				reactions: {
					property1: 0,
					property2: 0,
				},
				reactionsSelf: ['string'],
				referenceId: 'string',
				timestamp: 0,
				token: 'string',
				lastEditActorDisplayName: 'string',
				lastEditActorId: 'string',
				lastEditActorType: 'string',
				lastEditTimestamp: 0,
				silent: true,
				parent: {
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: messageId,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: conversationId,
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
				},
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'deleteMessage',
					conversationId,
					messageId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'deleteMessage',
							conversationId,
							messageId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should make a Message Read', async () => {
			const conversationId = '12345';
			const lastReadMessage = null;

			const actualResponse = {
				actorId: 'string',
				actorType: 'string',
				attendeeId: 0,
				attendeePermissions: 0,
				attendeePin: 'string',
				avatarVersion: 'string',
				breakoutRoomMode: 0,
				breakoutRoomStatus: 0,
				callFlag: 0,
				callPermissions: 0,
				callRecording: 0,
				callStartTime: 0,
				canDeleteConversation: true,
				canEnableSIP: true,
				canLeaveConversation: true,
				canStartCall: true,
				defaultPermissions: 0,
				description: 'string',
				displayName: 'string',
				hasCall: true,
				hasPassword: true,
				id: 0,
				isCustomAvatar: true,
				isFavorite: true,
				lastActivity: 0,
				lastCommonReadMessage: 0,
				lastMessage: {
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: lastReadMessage,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: conversationId,
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
				},
				lastPing: 0,
				lastReadMessage: 0,
				listable: 0,
				lobbyState: 0,
				lobbyTimer: 0,
				mentionPermissions: 0,
				messageExpiration: 0,
				name: 'string',
				notificationCalls: 0,
				notificationLevel: 0,
				objectId: 'string',
				objectType: 'string',
				participantFlags: 0,
				participantType: 0,
				permissions: 0,
				readOnly: 0,
				recordingConsent: 0,
				remoteServer: 'string',
				remoteToken: 'string',
				sessionId: 'string',
				sipEnabled: 0,
				status: 'string',
				statusClearAt: 0,
				statusIcon: 'string',
				statusMessage: 'string',
				token: conversationId,
				type: 0,
				unreadMention: true,
				unreadMentionDirect: true,
				unreadMessages: 0,
				isArchived: true,
			};
			const mockResponse = {
				ocs: {
					meta: {
						status: 'string',
						statuscode: 0,
						message: 'string',
						totalitems: 'string',
						itemsperpage: 'string',
					},
					data: actualResponse,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'markRead',
					conversationId,
					lastReadMessage,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'markRead',
							conversationId,
							lastReadMessage,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should make a Message Unead', async () => {
			const conversationId = '12345';

			const actualResponse = {
				actorId: 'string',
				actorType: 'string',
				attendeeId: 0,
				attendeePermissions: 0,
				attendeePin: 'string',
				avatarVersion: 'string',
				breakoutRoomMode: 0,
				breakoutRoomStatus: 0,
				callFlag: 0,
				callPermissions: 0,
				callRecording: 0,
				callStartTime: 0,
				canDeleteConversation: true,
				canEnableSIP: true,
				canLeaveConversation: true,
				canStartCall: true,
				defaultPermissions: 0,
				description: 'string',
				displayName: 'string',
				hasCall: true,
				hasPassword: true,
				id: 0,
				isCustomAvatar: true,
				isFavorite: true,
				lastActivity: 0,
				lastCommonReadMessage: 0,
				lastMessage: {
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: 0,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: conversationId,
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
				},
				lastPing: 0,
				lastReadMessage: 0,
				listable: 0,
				lobbyState: 0,
				lobbyTimer: 0,
				mentionPermissions: 0,
				messageExpiration: 0,
				name: 'string',
				notificationCalls: 0,
				notificationLevel: 0,
				objectId: 'string',
				objectType: 'string',
				participantFlags: 0,
				participantType: 0,
				permissions: 0,
				readOnly: 0,
				recordingConsent: 0,
				remoteServer: 'string',
				remoteToken: 'string',
				sessionId: 'string',
				sipEnabled: 0,
				status: 'string',
				statusClearAt: 0,
				statusIcon: 'string',
				statusMessage: 'string',
				token: conversationId,
				type: 0,
				unreadMention: true,
				unreadMentionDirect: true,
				unreadMessages: 0,
				isArchived: true,
			};
			const mockResponse = {
				ocs: {
					meta: {
						status: 'string',
						statuscode: 0,
						message: 'string',
						totalitems: 'string',
						itemsperpage: 'string',
					},
					data: actualResponse,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'markUnread',
					conversationId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'markUnread',
							conversationId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should retrieve all conversations', async () => {
			const actualResponse = [
				{
					actorId: 'string',
					actorType: 'string',
					attendeeId: 0,
					attendeePermissions: 0,
					attendeePin: 'string',
					avatarVersion: 'string',
					breakoutRoomMode: 0,
					breakoutRoomStatus: 0,
					callFlag: 0,
					callPermissions: 0,
					callRecording: 0,
					callStartTime: 0,
					canDeleteConversation: true,
					canEnableSIP: true,
					canLeaveConversation: true,
					canStartCall: true,
					defaultPermissions: 0,
					description: 'string',
					displayName: 'string',
					hasCall: true,
					hasPassword: true,
					id: 0,
					isCustomAvatar: true,
					isFavorite: true,
					lastActivity: 0,
					lastCommonReadMessage: 0,
					lastMessage: {
						actorDisplayName: 'string',
						actorId: 'string',
						actorType: 'string',
						expirationTimestamp: 0,
						message: 'string',
						messageParameters: {
							property1: {
								type: 'string',
								id: 'string',
								name: 'string',
								server: 'string',
								link: 'string',
								'call-type': 'one2one',
								'icon-url': 'string',
								'message-id': 'string',
								boardname: 'string',
								stackname: 'string',
								size: 'string',
								path: 'string',
								mimetype: 'string',
								'preview-available': 'yes',
								mtime: 'string',
								latitude: 'string',
								longitude: 'string',
								description: 'string',
								thumb: 'string',
								website: 'string',
								visibility: '0',
								assignable: '0',
								conversation: 'string',
								etag: 'string',
								permissions: 'string',
								width: 'string',
								height: 'string',
								blurhash: 'string',
							},
							property2: {
								type: 'string',
								id: 'string',
								name: 'string',
								server: 'string',
								link: 'string',
								'call-type': 'one2one',
								'icon-url': 'string',
								'message-id': 'string',
								boardname: 'string',
								stackname: 'string',
								size: 'string',
								path: 'string',
								mimetype: 'string',
								'preview-available': 'yes',
								mtime: 'string',
								latitude: 'string',
								longitude: 'string',
								description: 'string',
								thumb: 'string',
								website: 'string',
								visibility: '0',
								assignable: '0',
								conversation: 'string',
								etag: 'string',
								permissions: 'string',
								width: 'string',
								height: 'string',
								blurhash: 'string',
							},
						},
						messageType: 'string',
						systemMessage: 'string',
						deleted: true,
						id: 0,
						isReplyable: true,
						markdown: true,
						reactions: {
							property1: 0,
							property2: 0,
						},
						reactionsSelf: ['string'],
						referenceId: 'string',
						timestamp: 0,
						token: 'string',
						lastEditActorDisplayName: 'string',
						lastEditActorId: 'string',
						lastEditActorType: 'string',
						lastEditTimestamp: 0,
						silent: true,
					},
					lastPing: 0,
					lastReadMessage: 0,
					listable: 0,
					lobbyState: 0,
					lobbyTimer: 0,
					mentionPermissions: 0,
					messageExpiration: 0,
					name: 'string',
					notificationCalls: 0,
					notificationLevel: 0,
					objectId: 'string',
					objectType: 'string',
					participantFlags: 0,
					participantType: 0,
					permissions: 0,
					readOnly: 0,
					recordingConsent: 0,
					remoteServer: 'string',
					remoteToken: 'string',
					sessionId: 'string',
					sipEnabled: 0,
					status: 'string',
					statusClearAt: 0,
					statusIcon: 'string',
					statusMessage: 'string',
					token: 'string',
					type: 0,
					unreadMention: true,
					unreadMentionDirect: true,
					unreadMessages: 0,
					isArchived: true,
				},
			];
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'getConversations',
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com/ocs/v2.php/apps/spreed/api/v4/room',
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'getConversations',
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual(actualResponse);
		});
		it('should retrieve a conversation', async () => {
			const conversationId = '67890';
			const actualResponse = {
				actorId: 'string',
				actorType: 'string',
				attendeeId: 0,
				attendeePermissions: 0,
				attendeePin: 'string',
				avatarVersion: 'string',
				breakoutRoomMode: 0,
				breakoutRoomStatus: 0,
				callFlag: 0,
				callPermissions: 0,
				callRecording: 0,
				callStartTime: 0,
				canDeleteConversation: true,
				canEnableSIP: true,
				canLeaveConversation: true,
				canStartCall: true,
				defaultPermissions: 0,
				description: 'string',
				displayName: 'string',
				hasCall: true,
				hasPassword: true,
				id: 0,
				isCustomAvatar: true,
				isFavorite: true,
				lastActivity: 0,
				lastCommonReadMessage: 0,
				lastMessage: {
					actorDisplayName: 'string',
					actorId: 'string',
					actorType: 'string',
					expirationTimestamp: 0,
					message: 'string',
					messageParameters: {
						property1: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
						property2: {
							type: 'string',
							id: 'string',
							name: 'string',
							server: 'string',
							link: 'string',
							'call-type': 'one2one',
							'icon-url': 'string',
							'message-id': 'string',
							boardname: 'string',
							stackname: 'string',
							size: 'string',
							path: 'string',
							mimetype: 'string',
							'preview-available': 'yes',
							mtime: 'string',
							latitude: 'string',
							longitude: 'string',
							description: 'string',
							thumb: 'string',
							website: 'string',
							visibility: '0',
							assignable: '0',
							conversation: 'string',
							etag: 'string',
							permissions: 'string',
							width: 'string',
							height: 'string',
							blurhash: 'string',
						},
					},
					messageType: 'string',
					systemMessage: 'string',
					deleted: true,
					id: 0,
					isReplyable: true,
					markdown: true,
					reactions: {
						property1: 0,
						property2: 0,
					},
					reactionsSelf: ['string'],
					referenceId: 'string',
					timestamp: 0,
					token: 'string',
					lastEditActorDisplayName: 'string',
					lastEditActorId: 'string',
					lastEditActorType: 'string',
					lastEditTimestamp: 0,
					silent: true,
				},
				lastPing: 0,
				lastReadMessage: 0,
				listable: 0,
				lobbyState: 0,
				lobbyTimer: 0,
				mentionPermissions: 0,
				messageExpiration: 0,
				name: 'string',
				notificationCalls: 0,
				notificationLevel: 0,
				objectId: 'string',
				objectType: 'string',
				participantFlags: 0,
				participantType: 0,
				permissions: 0,
				readOnly: 0,
				recordingConsent: 0,
				remoteServer: 'string',
				remoteToken: 'string',
				sessionId: 'string',
				sipEnabled: 0,
				status: 'string',
				statusClearAt: 0,
				statusIcon: 'string',
				statusMessage: 'string',
				token: 'string',
				type: 0,
				unreadMention: true,
				unreadMentionDirect: true,
				unreadMessages: 0,
				isArchived: true,
			};

			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'getConversation',
					conversationId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(conversationId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'getConversation',
							conversationId,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			requestSpy.mockRestore();
		});
		it('should create a conversation', async () => {
			const roomName = 'New conversation';
			const roomType = 3;
			const invite = '6789';
			const source = 'abcd';
			const expectedBody = {
				roomName,
				roomType,
			};
			if (invite && (roomType === 1 || roomType === 2)) {
				expectedBody.invite = invite; // Use bracket notation
			}

			// Add source if roomType is 2 and source is provided (for groups and circles)
			if (roomType === 2 && source) {
				expectedBody.source = source; // Use bracket notation
			}
			const expectedUrl = 'ocs/v2.php/apps/spreed/api/v4/room';
			const actualResponse = {
				id: 10,
				token: 'vv2mxv6g',
				type: roomType,
				name: roomName,
				displayName: 'new',
				objectType: '',
				objectId: '',
				participantType: 1,
				participantFlags: 0,
				readOnly: 0,
				hasPassword: false,
				hasCall: false,
				callStartTime: 0,
				callRecording: 0,
				canStartCall: true,
				lastActivity: 1730287552,
				lastReadMessage: 141,
				unreadMessages: 0,
				unreadMention: false,
				unreadMentionDirect: false,
				isFavorite: false,
				canLeaveConversation: true,
				canDeleteConversation: true,
				notificationLevel: 2,
				notificationCalls: 1,
				lobbyState: 0,
				lobbyTimer: 0,
				lastPing: 0,
				sessionId: '0',
				lastMessage: {
					id: 141,
					token: 'vv2mxv6g',
					actorType: 'users',
					actorId: 'abdullah',
					actorDisplayName: 'abdullah',
					timestamp: 1730287552,
					message: 'You created the conversation',
					messageParameters: {
						actor: {
							type: 'user',
							id: 'abdullah',
							name: 'abdullah',
						},
					},
					systemMessage: 'conversation_created',
					messageType: 'system',
					isReplyable: false,
					referenceId: '',
					reactions: {},
					expirationTimestamp: 0,
					markdown: false,
				},
				sipEnabled: 0,
				actorType: 'users',
				actorId: 'abdullah',
				attendeeId: 11,
				permissions: 254,
				attendeePermissions: 0,
				callPermissions: 0,
				defaultPermissions: 0,
				canEnableSIP: false,
				attendeePin: '',
				description: '',
				lastCommonReadMessage: 141,
				listable: 0,
				callFlag: 0,
				messageExpiration: 0,
				avatarVersion: '982f83fe',
				isCustomAvatar: false,
				breakoutRoomMode: 0,
				breakoutRoomStatus: 0,
				recordingConsent: 0,
				mentionPermissions: 0,
				isArchived: false,
			};
			const mockResponse = {
				ocs: {
					meta: { status: 'ok' },
					data: actualResponse,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'createConversation',
					conversationName: roomName,
					conversationType: roomType,
					invite,
					source,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: 'https://example.com/ocs/v2.php/apps/spreed/api/v4/room', // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'createConversation',
							conversationName: roomName,
							conversationType: roomType,
							invite,
							source,
						},
					},
				],
			]);

			const result = await node.execute.call(executeFunctions);
			expect(extractJsonValues(result)).toEqual([actualResponse]);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('POST');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);

			requestSpy.mockRestore();
		});
		it('should update a conversation', async () => {
			const conversationId = '67890';
			const roomName = 'Updated conversation';
			const expectedBody = {
				roomName,
			};

			const expectedUrl = `ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(conversationId)}`;
			const mockResponse = {
				ocs: {
					meta: {
						status: 'string',
						statuscode: 0,
						message: 'string',
						totalitems: 'string',
						itemsperpage: 'string',
					},
					data: null,
				},
			};

			// Mock the nextCloudApiRequest to simulate API behavior
			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			// Mock input parameters for execution context
			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'updateConversation',
					conversationName: roomName,
					conversationId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(conversationId)}`, // Mocked WebDAV URL
			});

			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'updateConversation',
							conversationName: roomName,
							conversationId,
						},
					},
				],
			]);

			await node.execute.call(executeFunctions);
			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('PUT');
			expect(calls[0][2]).toContain(expectedUrl);
			expect(JSON.parse(calls[0][3])).toMatchObject(expectedBody);

			requestSpy.mockRestore();
		});
		it('should delete a conversation', async () => {
			const conversationId = '12345';
			const expectedUrl = `ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(conversationId)}`;

			const mockResponse = {
				ocs: {
					meta: {
						status: 'string',
						statuscode: 0,
						message: 'string',
						totalitems: 'string',
						itemsperpage: 'string',
					},
					data: null,
				},
			};

			const requestSpy = jest.spyOn(nextCloudApiRequest, 'call').mockResolvedValue(mockResponse);

			executeFunctions.getNodeParameter.mockImplementation((param) => {
				const params = {
					authentication: 'accessToken',
					resource: 'talk',
					operation: 'deleteConversation',
					conversationId,
				};
				return params[param];
			});

			executeFunctions.getCredentials.mockResolvedValue({
				webDavUrl: `https://example.com/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(conversationId)}`,
			});
			executeFunctions.getInputData.mockReturnValue([
				[
					{
						json: {
							authentication: 'accessToken',
							resource: 'talk',
							operation: 'deleteConversation',
							conversationId,
						},
					},
				],
			]);

			await node.execute.call(executeFunctions);

			const calls = requestSpy.mock.calls;
			expect(calls[0][1]).toContain('DELETE');
			expect(calls[0][2]).toContain(expectedUrl);
			requestSpy.mockRestore();
		});
	});

	// Add similar test suites for File and Folder operations as needed
});
