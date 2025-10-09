import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { todoistApiRequest, todoistSyncRequest } from '../../GenericFunctions';
import {
	CreateHandler,
	CloseHandler,
	DeleteHandler,
	GetHandler,
	GetAllHandler,
	ReopenHandler,
	UpdateHandler,
	MoveHandler,
	ProjectCreateHandler,
	ProjectDeleteHandler,
	ProjectGetHandler,
	ProjectGetAllHandler,
	ProjectUpdateHandler,
	ProjectArchiveHandler,
	ProjectUnarchiveHandler,
	ProjectGetCollaboratorsHandler,
	SectionCreateHandler,
	SectionDeleteHandler,
	SectionGetHandler,
	SectionGetAllHandler,
	SectionUpdateHandler,
	CommentCreateHandler,
	CommentDeleteHandler,
	CommentGetHandler,
	CommentGetAllHandler,
	CommentUpdateHandler,
	LabelCreateHandler,
	LabelDeleteHandler,
	LabelGetHandler,
	LabelGetAllHandler,
	LabelUpdateHandler,
	QuickAddHandler,
} from '../OperationHandler';

// Mock the GenericFunctions
jest.mock('../../GenericFunctions', () => ({
	todoistApiRequest: jest.fn(),
	todoistSyncRequest: jest.fn(),
	FormatDueDatetime: jest.fn((dateTime: string) => dateTime),
}));

// Mock uuid
jest.mock('uuid', () => ({
	v4: jest.fn(() => 'mock-uuid-123'),
}));

const mockTodoistApiRequest = todoistApiRequest as jest.MockedFunction<typeof todoistApiRequest>;
const mockTodoistSyncRequest = todoistSyncRequest as jest.MockedFunction<typeof todoistSyncRequest>;

// Mock Context interface
const createMockContext = (params: Record<string, any> = {}) =>
	mock<IExecuteFunctions>({
		getNodeParameter: jest.fn((key: string, _idx?: number, defaultValue?: any) =>
			key in params ? params[key] : defaultValue,
		),
		getNode: jest.fn(() => mock<INode>({ typeVersion: 2.1 })),
	});

describe('OperationHandler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Task Handlers', () => {
		describe('CreateHandler', () => {
			it('should create a task successfully', async () => {
				const handler = new CreateHandler();
				const mockCtx = createMockContext({
					content: 'Test task',
					project: '123456',
					labels: ['work', 'urgent'],
					options: {
						description: 'Test description',
						priority: 3,
					},
				});

				const expectedResponse = {
					id: '789',
					content: 'Test task',
					project_id: '123456',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/tasks',
					expect.objectContaining({
						content: 'Test task',
						project_id: '123456',
						description: 'Test description',
						priority: 3,
						labels: ['work', 'urgent'],
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should handle task creation with due date', async () => {
				const handler = new CreateHandler();
				const mockCtx = createMockContext({
					content: 'Task with due date',
					project: '123456',
					options: {
						dueDate: '2025-12-31',
						dueDateTime: '2025-12-31T15:30:00',
						dueString: 'tomorrow',
						dueLang: 'en',
					},
				});

				mockTodoistApiRequest.mockResolvedValue({ id: '789' });

				await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/tasks',
					expect.objectContaining({
						content: 'Task with due date',
						project_id: '123456',
						due_date: '2025-12-31',
						due_datetime: '2025-12-31T15:30:00',
						due_string: 'tomorrow',
						due_lang: 'en',
					}),
				);
			});
		});

		describe('CloseHandler', () => {
			it('should close a task successfully', async () => {
				const handler = new CloseHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('POST', '/tasks/123456/close');
				expect(result).toEqual({ success: true });
			});
		});

		describe('DeleteHandler', () => {
			it('should delete a task successfully', async () => {
				const handler = new DeleteHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('DELETE', '/tasks/123456');
				expect(result).toEqual({ success: true });
			});
		});

		describe('GetHandler', () => {
			it('should get a task successfully', async () => {
				const handler = new GetHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
				});

				const expectedResponse = {
					id: '123456',
					content: 'Test task',
					project_id: '789',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/tasks/123456');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('GetAllHandler', () => {
			it('should get all tasks successfully', async () => {
				const handler = new GetAllHandler();
				const mockCtx = createMockContext({
					returnAll: false,
					limit: 10,
					filters: {
						projectId: '123456',
						labelId: '789',
					},
				});

				const mockApiResponse = [
					{ id: '1', content: 'Task 1' },
					{ id: '2', content: 'Task 2' },
				];

				mockTodoistApiRequest.mockResolvedValue([...mockApiResponse]);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'GET',
					'/tasks',
					{},
					expect.objectContaining({
						project_id: '123456',
						label: '789',
					}),
				);
				// splice(0, 10) on a 2-element array removes and returns all 2 elements
				expect(result).toEqual({ data: mockApiResponse });
			});

			it('should return all tasks when returnAll is true', async () => {
				const handler = new GetAllHandler();
				const mockCtx = createMockContext({
					returnAll: true,
					filters: {},
				});

				const expectedResponse = Array.from({ length: 150 }, (_, i) => ({ id: i.toString() }));
				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('ReopenHandler', () => {
			it('should reopen a task successfully', async () => {
				const handler = new ReopenHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('POST', '/tasks/123456/reopen');
				expect(result).toEqual({ success: true });
			});
		});

		describe('UpdateHandler', () => {
			it('should update a task successfully', async () => {
				const handler = new UpdateHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
					updateFields: {
						content: 'Updated task',
						description: 'Updated description',
						priority: 2,
						labels: ['updated'],
					},
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/tasks/123456',
					expect.objectContaining({
						content: 'Updated task',
						description: 'Updated description',
						priority: 2,
						labels: ['updated'],
					}),
				);
				expect(result).toEqual({ success: true });
			});
		});

		describe('MoveHandler', () => {
			it('should move a task successfully', async () => {
				const handler = new MoveHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
					project: '789',
					options: {},
				});

				mockTodoistSyncRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						commands: [
							expect.objectContaining({
								type: 'item_move',
								uuid: 'mock-uuid-123',
								args: expect.objectContaining({
									id: '123456',
									project_id: '789',
								}),
							}),
						],
					}),
				);
				expect(result).toEqual({ success: true });
			});

			it('should move a task to a section', async () => {
				const handler = new MoveHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
					project: '789',
					options: {
						section: '456',
					},
				});

				mockTodoistSyncRequest.mockResolvedValue(undefined);

				await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						commands: [
							expect.objectContaining({
								args: expect.objectContaining({
									id: '123456',
									section_id: '456',
								}),
							}),
						],
					}),
				);
			});
		});
	});

	describe('Project Handlers', () => {
		describe('ProjectCreateHandler', () => {
			it('should create a project successfully', async () => {
				const handler = new ProjectCreateHandler();
				const mockCtx = createMockContext({
					name: 'Test Project',
					projectOptions: {
						color: 'blue',
						is_favorite: true,
						view_style: 'board',
					},
				});

				const expectedResponse = {
					id: '123456',
					name: 'Test Project',
					color: 'blue',
					is_favorite: true,
					view_style: 'board',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/projects',
					expect.objectContaining({
						name: 'Test Project',
						color: 'blue',
						is_favorite: true,
						view_style: 'board',
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('ProjectGetHandler', () => {
			it('should get a project successfully', async () => {
				const handler = new ProjectGetHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
				});

				const expectedResponse = {
					id: '123456',
					name: 'Test Project',
					color: 'blue',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/projects/123456');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('ProjectGetAllHandler', () => {
			it('should get all projects successfully', async () => {
				const handler = new ProjectGetAllHandler();
				const mockCtx = createMockContext({});

				const expectedResponse = [
					{ id: '1', name: 'Project 1' },
					{ id: '2', name: 'Project 2' },
				];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/projects');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('ProjectUpdateHandler', () => {
			it('should update a project successfully', async () => {
				const handler = new ProjectUpdateHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
					projectUpdateFields: {
						name: 'Updated Project',
						color: 'red',
						is_favorite: false,
					},
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/projects/123456',
					expect.objectContaining({
						name: 'Updated Project',
						color: 'red',
						is_favorite: false,
					}),
				);
				expect(result).toEqual({ success: true });
			});
		});

		describe('ProjectDeleteHandler', () => {
			it('should delete a project successfully', async () => {
				const handler = new ProjectDeleteHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('DELETE', '/projects/123456');
				expect(result).toEqual({ success: true });
			});
		});

		describe('ProjectArchiveHandler', () => {
			it('should archive a project successfully', async () => {
				const handler = new ProjectArchiveHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('POST', '/projects/123456/archive');
				expect(result).toEqual({ success: true });
			});
		});

		describe('ProjectUnarchiveHandler', () => {
			it('should unarchive a project successfully', async () => {
				const handler = new ProjectUnarchiveHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('POST', '/projects/123456/unarchive');
				expect(result).toEqual({ success: true });
			});
		});

		describe('ProjectGetCollaboratorsHandler', () => {
			it('should get project collaborators successfully', async () => {
				const handler = new ProjectGetCollaboratorsHandler();
				const mockCtx = createMockContext({
					projectId: '123456',
				});

				const expectedResponse = [
					{ id: '1', name: 'User 1', email: 'user1@example.com' },
					{ id: '2', name: 'User 2', email: 'user2@example.com' },
				];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/projects/123456/collaborators');
				expect(result).toEqual({ data: expectedResponse });
			});
		});
	});

	describe('Section Handlers', () => {
		describe('SectionCreateHandler', () => {
			it('should create a section successfully', async () => {
				const handler = new SectionCreateHandler();
				const mockCtx = createMockContext({
					sectionName: 'Test Section',
					sectionProject: '123456',
					sectionOptions: {
						order: 1,
					},
				});

				const expectedResponse = {
					id: '789',
					name: 'Test Section',
					project_id: '123456',
					order: 1,
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/sections',
					expect.objectContaining({
						name: 'Test Section',
						project_id: '123456',
						order: 1,
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('SectionGetHandler', () => {
			it('should get a section successfully', async () => {
				const handler = new SectionGetHandler();
				const mockCtx = createMockContext({
					sectionId: '123456',
				});

				const expectedResponse = {
					id: '123456',
					name: 'Test Section',
					project_id: '789',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/sections/123456');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('SectionGetAllHandler', () => {
			it('should get all sections successfully', async () => {
				const handler = new SectionGetAllHandler();
				const mockCtx = createMockContext({
					sectionFilters: {
						project_id: '123456',
					},
				});

				const expectedResponse = [
					{ id: '1', name: 'Section 1', project_id: '123456' },
					{ id: '2', name: 'Section 2', project_id: '123456' },
				];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'GET',
					'/sections',
					{},
					expect.objectContaining({
						project_id: '123456',
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('SectionUpdateHandler', () => {
			it('should update a section successfully', async () => {
				const handler = new SectionUpdateHandler();
				const mockCtx = createMockContext({
					sectionId: '123456',
					sectionUpdateFields: {
						name: 'Updated Section',
					},
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/sections/123456',
					expect.objectContaining({
						name: 'Updated Section',
					}),
				);
				expect(result).toEqual({ success: true });
			});
		});

		describe('SectionDeleteHandler', () => {
			it('should delete a section successfully', async () => {
				const handler = new SectionDeleteHandler();
				const mockCtx = createMockContext({
					sectionId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('DELETE', '/sections/123456');
				expect(result).toEqual({ success: true });
			});
		});
	});

	describe('Label Handlers', () => {
		describe('LabelCreateHandler', () => {
			it('should create a label successfully', async () => {
				const handler = new LabelCreateHandler();
				const mockCtx = createMockContext({
					labelName: 'Test Label',
					labelOptions: {
						color: 'red',
						order: 1,
						is_favorite: true,
					},
				});

				const expectedResponse = {
					id: '123456',
					name: 'Test Label',
					color: 'red',
					order: 1,
					is_favorite: true,
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/labels',
					expect.objectContaining({
						name: 'Test Label',
						color: 'red',
						order: 1,
						is_favorite: true,
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('LabelGetHandler', () => {
			it('should get a label successfully', async () => {
				const handler = new LabelGetHandler();
				const mockCtx = createMockContext({
					labelId: '123456',
				});

				const expectedResponse = {
					id: '123456',
					name: 'Test Label',
					color: 'red',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/labels/123456');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('LabelGetAllHandler', () => {
			it('should get all labels successfully', async () => {
				const handler = new LabelGetAllHandler();
				const mockCtx = createMockContext({});

				const expectedResponse = [
					{ id: '1', name: 'Label 1', color: 'red' },
					{ id: '2', name: 'Label 2', color: 'blue' },
				];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/labels');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('LabelUpdateHandler', () => {
			it('should update a label successfully', async () => {
				const handler = new LabelUpdateHandler();
				const mockCtx = createMockContext({
					labelId: '123456',
					labelUpdateFields: {
						name: 'Updated Label',
						color: 'green',
						is_favorite: false,
					},
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/labels/123456',
					expect.objectContaining({
						name: 'Updated Label',
						color: 'green',
						is_favorite: false,
					}),
				);
				expect(result).toEqual({ success: true });
			});
		});

		describe('LabelDeleteHandler', () => {
			it('should delete a label successfully', async () => {
				const handler = new LabelDeleteHandler();
				const mockCtx = createMockContext({
					labelId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('DELETE', '/labels/123456');
				expect(result).toEqual({ success: true });
			});
		});
	});

	describe('Comment Handlers', () => {
		describe('CommentCreateHandler', () => {
			it('should create a comment successfully', async () => {
				const handler = new CommentCreateHandler();
				const mockCtx = createMockContext({
					commentTaskId: '123456',
					commentContent: 'Test comment',
				});

				const expectedResponse = {
					id: '789',
					task_id: '123456',
					content: 'Test comment',
					posted_at: '2025-08-03T12:00:00Z',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/comments',
					expect.objectContaining({
						task_id: '123456',
						content: 'Test comment',
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('CommentGetHandler', () => {
			it('should get a comment successfully', async () => {
				const handler = new CommentGetHandler();
				const mockCtx = createMockContext({
					commentId: '123456',
				});

				const expectedResponse = {
					id: '123456',
					task_id: '789',
					content: 'Test comment',
				};

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('GET', '/comments/123456');
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('CommentGetAllHandler', () => {
			it('should get all comments with task filter successfully', async () => {
				const handler = new CommentGetAllHandler();
				const mockCtx = createMockContext({
					commentFilters: {
						task_id: '123456',
					},
				});

				const expectedResponse = [
					{ id: '1', task_id: '123456', content: 'Comment 1' },
					{ id: '2', task_id: '123456', content: 'Comment 2' },
				];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'GET',
					'/comments',
					{},
					expect.objectContaining({
						task_id: '123456',
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should get all comments with project filter successfully', async () => {
				const handler = new CommentGetAllHandler();
				const mockCtx = createMockContext({
					commentFilters: {
						project_id: '789',
					},
				});

				const expectedResponse = [{ id: '1', project_id: '789', content: 'Comment 1' }];

				mockTodoistApiRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'GET',
					'/comments',
					{},
					expect.objectContaining({
						project_id: '789',
					}),
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});

		describe('CommentUpdateHandler', () => {
			it('should update a comment successfully', async () => {
				const handler = new CommentUpdateHandler();
				const mockCtx = createMockContext({
					commentId: '123456',
					commentUpdateFields: {
						content: 'Updated comment',
					},
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith(
					'POST',
					'/comments/123456',
					expect.objectContaining({
						content: 'Updated comment',
					}),
				);
				expect(result).toEqual({ success: true });
			});
		});

		describe('CommentDeleteHandler', () => {
			it('should delete a comment successfully', async () => {
				const handler = new CommentDeleteHandler();
				const mockCtx = createMockContext({
					commentId: '123456',
				});

				mockTodoistApiRequest.mockResolvedValue(undefined);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistApiRequest).toHaveBeenCalledWith('DELETE', '/comments/123456');
				expect(result).toEqual({ success: true });
			});
		});
	});

	describe('Special Operations', () => {
		describe('QuickAddHandler', () => {
			it('should quick add a task successfully', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Buy milk tomorrow @shopping',
					options: {},
				});

				const expectedResponse = {
					id: '123456',
					content: 'Buy milk',
					project_id: '789',
					labels: ['shopping'],
					due: {
						date: '2025-08-04',
						string: 'tomorrow',
					},
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{ text: 'Buy milk tomorrow @shopping' },
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should quick add a task with all optional parameters', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Meeting with team tomorrow at 2pm',
					options: {
						note: 'Discuss project roadmap and priorities',
						reminder: 'tomorrow at 1:30pm',
						auto_reminder: true,
					},
				});

				const expectedResponse = {
					id: '789123',
					content: 'Meeting with team',
					project_id: '456',
					due: {
						date: '2025-08-04',
						datetime: '2025-08-04T14:00:00',
						string: 'tomorrow at 2pm',
					},
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{
						text: 'Meeting with team tomorrow at 2pm',
						note: 'Discuss project roadmap and priorities',
						reminder: 'tomorrow at 1:30pm',
						auto_reminder: true,
					},
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should quick add a task with note only', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Review documents',
					options: {
						note: 'Check the quarterly reports',
					},
				});

				const expectedResponse = {
					id: '456789',
					content: 'Review documents',
					project_id: '123',
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{
						text: 'Review documents',
						note: 'Check the quarterly reports',
					},
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should quick add a task with reminder only', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Call dentist',
					options: {
						reminder: 'next Monday at 9am',
					},
				});

				const expectedResponse = {
					id: '321654',
					content: 'Call dentist',
					project_id: '456',
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{
						text: 'Call dentist',
						reminder: 'next Monday at 9am',
					},
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should quick add a task with auto_reminder only', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Presentation due Friday at 5pm',
					options: {
						auto_reminder: true,
					},
				});

				const expectedResponse = {
					id: '987654',
					content: 'Presentation due',
					project_id: '789',
					due: {
						date: '2025-08-08',
						datetime: '2025-08-08T17:00:00',
						string: 'Friday at 5pm',
					},
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{
						text: 'Presentation due Friday at 5pm',
						auto_reminder: true,
					},
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});

			it('should handle empty optional parameters correctly', async () => {
				const handler = new QuickAddHandler();
				const mockCtx = createMockContext({
					text: 'Simple task',
					options: {
						note: '',
						reminder: '',
						auto_reminder: false,
					},
				});

				const expectedResponse = {
					id: '111222',
					content: 'Simple task',
					project_id: '333',
				};

				mockTodoistSyncRequest.mockResolvedValue(expectedResponse);

				const result = await handler.handleOperation(mockCtx, 0);

				// Should only include text since other options are empty/false
				expect(mockTodoistSyncRequest).toHaveBeenCalledWith(
					{ text: 'Simple task' },
					{},
					'/quick/add',
				);
				expect(result).toEqual({ data: expectedResponse });
			});
		});
	});

	describe('Error Handling', () => {
		describe('Type Validation', () => {
			it('should throw error for invalid task ID type', async () => {
				const handler = new GetHandler();
				const mockCtx = createMockContext({
					taskId: null,
				});

				await expect(handler.handleOperation(mockCtx, 0)).rejects.toThrow();
			});

			it('should throw error for invalid project ID type', async () => {
				const handler = new ProjectGetHandler();
				const mockCtx = createMockContext({
					projectId: {},
				});

				await expect(handler.handleOperation(mockCtx, 0)).rejects.toThrow();
			});

			it('should throw error for invalid content type in task creation', async () => {
				const handler = new CreateHandler();
				const mockCtx = createMockContext({
					content: 123,
					project: '789',
					options: {},
				});

				await expect(handler.handleOperation(mockCtx, 0)).rejects.toThrow();
			});
		});

		describe('API Error Handling', () => {
			it('should propagate API errors', async () => {
				const handler = new GetHandler();
				const mockCtx = createMockContext({
					taskId: '123456',
				});

				const apiError = new Error('API Error');
				mockTodoistApiRequest.mockRejectedValue(apiError);

				await expect(handler.handleOperation(mockCtx, 0)).rejects.toThrow('API Error');
			});
		});
	});
});
