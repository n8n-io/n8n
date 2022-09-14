import { INodeProperties } from 'n8n-workflow';

const resource = ['task'];

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a task',
				action: 'Get data of a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many tasks',
				action: 'Get data of all tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
			},
		],
		default: 'getAll',
	},
];

export const taskFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                task:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether to only return active tasks and false to return inactive tasks',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The page number to use in pagination',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return tasks belonging to the task with the given ID',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource,
			},
		},
		description: 'The ID of the task you are retrieving',
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource,
			},
		},
		description: 'The ID of the task you want to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The name of the task',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable By Default',
				name: 'billable_by_default',
				type: 'boolean',
				default: true,
				description:
					'Whether default tasks should be marked billable when creating a new project. Defaults to true.',
			},
			{
				displayName: 'Default Hourly Rate',
				name: 'default_hourly_rate',
				type: 'number',
				default: 0,
				description:
					'The default hourly rate to use for this task when it is added to a project. Defaults to 0.',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether this task is active or archived. Defaults to true.',
			},
			{
				displayName: 'Is Default',
				name: 'is_default',
				type: 'boolean',
				default: false,
				description:
					'Whether this task should be automatically added to future projects. Defaults to false.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		description: 'The ID of the task you want to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Update Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable By Default',
				name: 'billable_by_default',
				type: 'boolean',
				default: false,
				description:
					'Whether default tasks should be marked billable when creating a new project. Defaults to true.',
			},
			{
				displayName: 'Default Hourly Rate',
				name: 'default_hourly_rate',
				type: 'number',
				default: 0,
				description:
					'The default hourly rate to use for this task when it is added to a project. Defaults to 0.',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether this task is active or archived. Defaults to true.',
			},
			{
				displayName: 'Is Default',
				name: 'is_default',
				type: 'boolean',
				default: false,
				description:
					'Whether this task should be automatically added to future projects. Defaults to false.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the task',
			},
		],
	},
];
