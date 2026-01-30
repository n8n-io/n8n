/**
 * Google Tasks Node のユニットテスト
 * tasks.list (getAll) 操作の showAssigned パラメータを含むクエリパラメータのテスト
 */
import { GoogleTasks } from '../GoogleTasks.node';

describe('GoogleTasks Node', () => {
	let googleTasksNode: GoogleTasks;

	beforeEach(() => {
		googleTasksNode = new GoogleTasks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(googleTasksNode.description.displayName).toBe('Google Tasks');
			expect(googleTasksNode.description.name).toBe('googleTasks');
			expect(googleTasksNode.description.version).toBe(1);
		});

		it('should have googleTasksOAuth2Api credentials', () => {
			const credentials = googleTasksNode.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials).toContainEqual(
				expect.objectContaining({
					name: 'googleTasksOAuth2Api',
					required: true,
				}),
			);
		});
	});

	describe('Task Operations', () => {
		it('should have all required operations', () => {
			const properties = googleTasksNode.description.properties;
			const operationProp = properties.find(
				(prop) =>
					prop.name === 'operation' && prop.displayOptions?.show?.resource?.includes('task'),
			);

			expect(operationProp).toBeDefined();
			expect(operationProp?.options).toContainEqual(expect.objectContaining({ value: 'create' }));
			expect(operationProp?.options).toContainEqual(expect.objectContaining({ value: 'delete' }));
			expect(operationProp?.options).toContainEqual(expect.objectContaining({ value: 'get' }));
			expect(operationProp?.options).toContainEqual(expect.objectContaining({ value: 'getAll' }));
			expect(operationProp?.options).toContainEqual(expect.objectContaining({ value: 'update' }));
		});
	});

	describe('GetAll Operation Additional Fields', () => {
		it('should have showAssigned parameter in additionalFields for getAll operation', () => {
			const properties = googleTasksNode.description.properties;
			const additionalFieldsProp = properties.find(
				(prop) =>
					prop.name === 'additionalFields' &&
					prop.displayOptions?.show?.operation?.includes('getAll'),
			);

			expect(additionalFieldsProp).toBeDefined();
			expect(additionalFieldsProp?.type).toBe('collection');

			const options = additionalFieldsProp?.options as Array<{ name: string; type: string }>;
			const showAssignedOption = options?.find((opt) => opt.name === 'showAssigned');

			expect(showAssignedOption).toBeDefined();
			expect(showAssignedOption?.type).toBe('boolean');
		});

		it('should have all Google Tasks API query parameters for getAll operation', () => {
			const properties = googleTasksNode.description.properties;
			const additionalFieldsProp = properties.find(
				(prop) =>
					prop.name === 'additionalFields' &&
					prop.displayOptions?.show?.operation?.includes('getAll'),
			);

			const options = additionalFieldsProp?.options as Array<{ name: string }>;
			const optionNames = options?.map((opt) => opt.name) ?? [];

			// Google Tasks API tasks.list のクエリパラメータ
			expect(optionNames).toContain('completedMax');
			expect(optionNames).toContain('completedMin');
			expect(optionNames).toContain('dueMax');
			expect(optionNames).toContain('dueMin');
			expect(optionNames).toContain('showCompleted');
			expect(optionNames).toContain('showDeleted');
			expect(optionNames).toContain('showHidden');
			expect(optionNames).toContain('showAssigned');
			expect(optionNames).toContain('updatedMin');
		});
	});

	describe('Execute Method - GetAll Operation', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let mockExecutionContext: any;

		beforeEach(() => {
			mockExecutionContext = {
				getNode: jest.fn().mockReturnValue({ name: 'Google Tasks' }),
				getNodeParameter: jest.fn(),
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				continueOnFail: jest.fn().mockReturnValue(false),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
					requestOAuth2: jest.fn().mockResolvedValue({ items: [] }),
					constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
				},
			};
		});

		it('should pass showAssigned=true to API when enabled', async () => {
			const taskListId = 'test-task-list-id';

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue?: unknown) => {
					if (parameterName === 'resource') return 'task';
					if (parameterName === 'operation') return 'getAll';
					if (parameterName === 'task') return taskListId;
					if (parameterName === 'returnAll') return false;
					if (parameterName === 'limit') return 20;
					if (parameterName === 'additionalFields') {
						return {
							showCompleted: true,
							showDeleted: false,
							showHidden: false,
							showAssigned: true,
						};
					}
					return defaultValue;
				},
			);

			await googleTasksNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleTasksOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
					qs: expect.objectContaining({
						showAssigned: true,
					}),
				}),
			);
		});

		it('should pass showAssigned=false to API when disabled (default)', async () => {
			const taskListId = 'test-task-list-id';

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue?: unknown) => {
					if (parameterName === 'resource') return 'task';
					if (parameterName === 'operation') return 'getAll';
					if (parameterName === 'task') return taskListId;
					if (parameterName === 'returnAll') return false;
					if (parameterName === 'limit') return 20;
					if (parameterName === 'additionalFields') {
						return {
							showCompleted: true,
							showDeleted: false,
							showHidden: false,
							showAssigned: false,
						};
					}
					return defaultValue;
				},
			);

			await googleTasksNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleTasksOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
					qs: expect.objectContaining({
						showAssigned: false,
					}),
				}),
			);
		});

		it('should use default value for showAssigned when not provided', async () => {
			const taskListId = 'test-task-list-id';

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue?: unknown) => {
					if (parameterName === 'resource') return 'task';
					if (parameterName === 'operation') return 'getAll';
					if (parameterName === 'task') return taskListId;
					if (parameterName === 'returnAll') return false;
					if (parameterName === 'limit') return 20;
					if (parameterName === 'additionalFields') {
						// showAssigned を指定しない場合（デフォルト値が使われる）
						return {};
					}
					return defaultValue;
				},
			);

			await googleTasksNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleTasksOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({
						showAssigned: false, // デフォルト値
					}),
				}),
			);
		});
	});
});
