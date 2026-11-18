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
	type TaskBoardSeverity,
} from 'n8n-workflow';

import { TASK_BOARD_DISABLED_MESSAGE } from './constants';

// Record Usage is not in this list: it has no actor and emits no task event.
const WRITE_OPERATIONS = ['create', 'addComment', 'move', 'assign', 'update', 'handoff'];

const COLUMN_ROLES = [
	{ name: 'Backlog', value: 'backlog' },
	{ name: 'Done', value: 'done' },
	{ name: 'In Progress', value: 'in_progress' },
	{ name: 'Needs Input', value: 'needs_input' },
	{ name: 'To Do', value: 'todo' },
];

const SEVERITIES: Array<{ name: string; value: TaskBoardSeverity }> = [
	{ name: 'Critical', value: 'critical' },
	{ name: 'High', value: 'high' },
	{ name: 'Low', value: 'low' },
	{ name: 'Medium', value: 'medium' },
];

const NO_SEVERITY = 'none';

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
						name: 'Hand Off',
						value: 'handoff',
						description: 'Hand a task off to another agent of the board',
						action: 'Hand off a task',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a task to another column',
						action: 'Move a task',
					},
					{
						name: 'Record Usage',
						value: 'recordUsage',
						description: 'Add the token usage of an agent run to a task',
						action: 'Record usage on a task',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Change the title, description, severity or tags of a task',
						action: 'Update a task',
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
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [{ name: 'None', value: NO_SEVERITY }, ...SEVERITIES],
				default: NO_SEVERITY,
				displayOptions: showFor('create'),
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'e.g. billing, refund',
				description:
					'Comma-separated list of tags. An expression can also return an array of strings.',
				displayOptions: showFor('create'),
			},

			// Task ID for all other operations
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: showFor(
					'get',
					'addComment',
					'move',
					'assign',
					'update',
					'handoff',
					'recordUsage',
				),
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

			// Update
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: showFor('update'),
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
					},
					{
						displayName: 'Severity',
						name: 'severity',
						type: 'options',
						options: [{ name: 'None', value: NO_SEVERITY }, ...SEVERITIES],
						default: NO_SEVERITY,
						description: 'None removes the severity',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'e.g. billing, refund',
						description:
							'Comma-separated list of tags. An expression can also return an array of strings. The new tags replace the current tags.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
					},
				],
			},

			// Hand off
			{
				displayName: 'Hand Off To',
				name: 'handoffTo',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID or the name of the agent that takes the task over',
				displayOptions: showFor('handoff'),
			},

			// Record usage
			{
				displayName: 'Agent ID',
				name: 'usageAgentId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the agent that used the tokens',
				displayOptions: showFor('recordUsage'),
			},
			{
				displayName: 'Prompt Tokens',
				name: 'promptTokens',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				displayOptions: showFor('recordUsage'),
			},
			{
				displayName: 'Completion Tokens',
				name: 'completionTokens',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				displayOptions: showFor('recordUsage'),
			},
			{
				displayName: 'Total Tokens',
				name: 'totalTokens',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				displayOptions: showFor('recordUsage'),
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: showFor('recordUsage'),
				options: [
					{
						displayName: 'Cost (USD)',
						name: 'cost',
						type: 'number',
						typeOptions: { minValue: 0, numberPrecision: 6 },
						default: 0,
						description: 'The cost of the agent run in US dollars',
					},
				],
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

const isUnset = (value: unknown) => value === undefined || value === null || value === '';

/** Returns `undefined` for an unset value, and `null` for the "None" option. */
function toSeverity(
	context: IExecuteFunctions,
	value: unknown,
	itemIndex: number,
): TaskBoardSeverity | null | undefined {
	if (isUnset(value)) return undefined;
	if (value === NO_SEVERITY) return null;
	const severity = SEVERITIES.find((option) => option.value === value);
	if (!severity) {
		throw new NodeOperationError(context.getNode(), `Unknown severity: ${String(value)}`, {
			itemIndex,
		});
	}
	return severity.value;
}

/** Accepts a comma-separated string or an array. Returns `undefined` for an unset value. */
function toTags(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	const parts: unknown[] = Array.isArray(value) ? value : String(value).split(',');
	return parts.map((part) => String(part).trim()).filter((part) => part !== '');
}

/** A missing or non-numeric value counts as zero, so a run without usage data does not fail. */
function toTokenCount(value: unknown): number {
	const count = Number(value);
	return Number.isFinite(count) && count > 0 ? count : 0;
}

function toCost(value: unknown): number | null {
	if (isUnset(value)) return null;
	const cost = Number(value);
	return Number.isFinite(cost) ? cost : null;
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
			const tags = toTags(context.getNodeParameter('tags', i, ''));
			return await proxy.createTask(
				{
					boardId: param('boardId'),
					title: param('title'),
					description: param('description'),
					columnRole: columnRole === 'default' ? undefined : columnRole,
					assignee:
						assigneeType === 'none' ? undefined : toAssignee(assigneeType, param('assigneeId')),
					severity:
						toSeverity(context, context.getNodeParameter('severity', i, NO_SEVERITY), i) ??
						undefined,
					tags: tags?.length ? tags : undefined,
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
		case 'update': {
			const updateFields = context.getNodeParameter('updateFields', i, {});
			const fields: Parameters<ITaskBoardProxy['updateTask']>[1] = {};
			// An expression that returns no value leaves the field as it is.
			if (!isUnset(updateFields.title)) fields.title = String(updateFields.title);
			if (updateFields.description !== undefined && updateFields.description !== null) {
				fields.description = String(updateFields.description);
			}
			const severity = toSeverity(context, updateFields.severity, i);
			if (severity !== undefined) fields.severity = severity;
			const tags = toTags(updateFields.tags);
			if (tags) fields.tags = tags;
			if (Object.keys(fields).length === 0) {
				throw new NodeOperationError(context.getNode(), 'Set at least one field to update', {
					itemIndex: i,
				});
			}
			return await proxy.updateTask(param('taskId'), fields, getActor(context, i));
		}
		case 'handoff': {
			// An expression can return no value, for example when an agent did not name a teammate.
			const to = String(context.getNodeParameter('handoffTo', i, '') ?? '').trim();
			if (!to) {
				throw new NodeOperationError(context.getNode(), 'Hand Off To is required', {
					itemIndex: i,
				});
			}
			const { task, handedOff } = await proxy.handoffTask(
				param('taskId'),
				to,
				getActor(context, i),
			);
			return { ...task, handedOff };
		}
		case 'recordUsage': {
			const options = context.getNodeParameter('options', i, {});
			return await proxy.recordUsage(param('taskId'), {
				agentId: param('usageAgentId').trim(),
				promptTokens: toTokenCount(context.getNodeParameter('promptTokens', i, 0)),
				completionTokens: toTokenCount(context.getNodeParameter('completionTokens', i, 0)),
				totalTokens: toTokenCount(context.getNodeParameter('totalTokens', i, 0)),
				cost: toCost(options.cost),
			});
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`, {
				itemIndex: i,
			});
	}
}
