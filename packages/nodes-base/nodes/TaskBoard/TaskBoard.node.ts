import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type ITaskBoardProxy,
	type TaskBoardActor,
	type TaskBoardAssigneeInput,
} from 'n8n-workflow';

const TASK_BOARD_DISABLED_MESSAGE =
	'Task boards are not enabled on this instance (set N8N_ENABLED_MODULES=task-board)';

const WRITE_OPERATIONS = ['create', 'addComment', 'move', 'assign'];

const COLUMN_ROLES = [
	{ name: 'Backlog', value: 'backlog' },
	{ name: 'Done', value: 'done' },
	{ name: 'In Progress', value: 'in_progress' },
	{ name: 'Needs Input', value: 'needs_input' },
	{ name: 'To Do', value: 'todo' },
];

const assigneeTypeOptions: INodeProperties['options'] = [
	{ name: 'Agent', value: 'agent' },
	{ name: 'User', value: 'user' },
];

const showFor = (...operations: string[]) => ({
	show: { resource: ['task'], operation: operations },
});

export class TaskBoard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Task Board',
		name: 'taskBoard',
		icon: 'fa:tasks',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Create and update tasks on a task board',
		defaults: {
			name: 'Task Board',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Task', value: 'task' }],
				default: 'task',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['task'] } },
				options: [
					{
						name: 'Add Comment',
						value: 'addComment',
						description: 'Add a comment to a task',
						action: 'Add a comment to a task',
					},
					{
						name: 'Assign',
						value: 'assign',
						description: 'Assign a task to a user or an agent, or unassign it',
						action: 'Assign a task',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a task',
						action: 'Create a task',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a task with its board, columns and comments',
						action: 'Get a task',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a task to another column',
						action: 'Move a task',
					},
				],
				default: 'create',
			},

			// Create
			{
				displayName: 'Board ID',
				name: 'boardId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Column',
				name: 'columnRole',
				type: 'options',
				options: [{ name: 'Default', value: 'default' }, ...COLUMN_ROLES],
				default: 'default',
				description: 'The column role to create the task in',
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Assignee Type',
				name: 'assigneeType',
				type: 'options',
				options: [{ name: 'None', value: 'none' }, ...(assigneeTypeOptions ?? [])],
				default: 'none',
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Assignee ID',
				name: 'assigneeId',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['task'], operation: ['create'] },
					hide: { assigneeType: ['none'] },
				},
			},

			// Task ID for all other operations
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: showFor('get', 'addComment', 'move', 'assign'),
			},

			// Add comment
			{
				displayName: 'Comment',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				displayOptions: showFor('addComment'),
			},

			// Move
			{
				displayName: 'Move To',
				name: 'moveTo',
				type: 'options',
				options: [
					{ name: 'Column Role', value: 'role' },
					{ name: 'Column ID', value: 'id' },
				],
				default: 'role',
				displayOptions: showFor('move'),
			},
			{
				displayName: 'Column Role',
				name: 'columnRoleTarget',
				type: 'options',
				options: COLUMN_ROLES,
				default: 'in_progress',
				displayOptions: { show: { resource: ['task'], operation: ['move'], moveTo: ['role'] } },
			},
			{
				displayName: 'Column ID',
				name: 'columnId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['task'], operation: ['move'], moveTo: ['id'] } },
			},

			// Assign
			{
				displayName: 'Unassign',
				name: 'unassign',
				type: 'boolean',
				default: false,
				displayOptions: showFor('assign'),
			},
			{
				displayName: 'Assignee Type',
				name: 'assignTargetType',
				type: 'options',
				options: assigneeTypeOptions,
				default: 'agent',
				displayOptions: { show: { resource: ['task'], operation: ['assign'], unassign: [false] } },
			},
			{
				displayName: 'Assignee ID',
				name: 'assignTargetId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['task'], operation: ['assign'], unassign: [false] } },
			},

			// Act as
			{
				displayName: 'Act As',
				name: 'actAs',
				type: 'options',
				options: [
					{ name: 'Agent', value: 'agent' },
					{ name: 'Workflow', value: 'workflow' },
				],
				default: 'workflow',
				description: 'Who the change is attributed to',
				displayOptions: showFor(...WRITE_OPERATIONS),
			},
			{
				displayName: 'Agent ID',
				name: 'actorAgentId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the agent that the change is attributed to',
				displayOptions: {
					show: { resource: ['task'], operation: WRITE_OPERATIONS, actAs: ['agent'] },
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		if (!this.helpers.getTaskBoardProxy) {
			throw new NodeOperationError(this.getNode(), TASK_BOARD_DISABLED_MESSAGE);
		}
		const proxy: ITaskBoardProxy = await this.helpers.getTaskBoardProxy();

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const result = await runOperation(this, proxy, operation, i);
				returnData.push({ json: { ...result }, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function getActor(context: IExecuteFunctions, itemIndex: number): TaskBoardActor {
	const actAs = context.getNodeParameter('actAs', itemIndex, 'workflow') as string;
	if (actAs === 'agent') {
		const id = (context.getNodeParameter('actorAgentId', itemIndex) as string).trim();
		if (!id) {
			throw new NodeOperationError(context.getNode(), 'Agent ID is required to act as an agent', {
				itemIndex,
			});
		}
		return { type: 'agent', id };
	}
	return { type: 'workflow', id: context.getWorkflow().id ?? '' };
}

function toAssignee(type: string, id: string): TaskBoardAssigneeInput {
	return type === 'user' ? { type: 'user', id } : { type: 'agent', id };
}

async function runOperation(
	context: IExecuteFunctions,
	proxy: ITaskBoardProxy,
	operation: string,
	i: number,
): Promise<object> {
	const param = (name: string) => context.getNodeParameter(name, i) as string;

	switch (operation) {
		case 'create': {
			const columnRole = param('columnRole');
			const assigneeType = param('assigneeType');
			return await proxy.createTask(
				{
					boardId: param('boardId'),
					title: param('title'),
					description: param('description'),
					columnRole: columnRole === 'default' ? undefined : columnRole,
					assignee:
						assigneeType === 'none' ? undefined : toAssignee(assigneeType, param('assigneeId')),
				},
				getActor(context, i),
			);
		}
		case 'get':
			return await proxy.getTaskContext(param('taskId'));
		case 'addComment':
			return await proxy.addComment(param('taskId'), param('body'), getActor(context, i));
		case 'move': {
			const target =
				param('moveTo') === 'id'
					? { columnId: param('columnId') }
					: { columnRole: param('columnRoleTarget') };
			return await proxy.moveTask(param('taskId'), target, getActor(context, i));
		}
		case 'assign': {
			const unassign = context.getNodeParameter('unassign', i) as boolean;
			const assignee = unassign
				? null
				: toAssignee(param('assignTargetType'), param('assignTargetId'));
			return await proxy.assignTask(param('taskId'), assignee, getActor(context, i));
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, {
				itemIndex: i,
			});
	}
}
