import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const taskFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 task:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'taskListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTaskLists',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'The identifier of the list, unique in the user\'s mailbox.',
	},
	{
		displayName: 'Subject',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'A brief description of the task.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the task.',
			},
			{
				displayName: 'Due',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be finished.',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				default: 'normal',
				description: 'The importance of the task.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Not started',
						value: 'notStarted',
					},
					{
						name: 'In progress',
						value: 'inProgress',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Waiting On Others',
						value: 'waitingOnOthers',
					},
					{
						name: 'Deferred',
						value: 'deferred',
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:get/delete/update/getAll              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'taskListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTaskLists',
		},
		displayOptions: {
			show: {
				operation: [
					'delete',
					'get',
					'getAll',
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'The identifier of the list, unique in the user\'s mailbox.',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
					'get',
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the task.',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be finished.',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				default: 'normal',
				description: 'The importance of the task.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Not started',
						value: 'notStarted',
					},
					{
						name: 'In progress',
						value: 'inProgress',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Waiting On Others',
						value: 'waitingOnOthers',
					},
					{
						name: 'Deferred',
						value: 'deferred',
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task.',
			},
			{
				displayName: 'Subject',
				name: 'title',
				type: 'string',
				default: '',
				description: 'A brief description of the task.',
			},
		],
	},
];
