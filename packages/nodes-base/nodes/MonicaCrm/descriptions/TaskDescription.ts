import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations = [
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
				description: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const taskFields = [
	// ----------------------------------------
	//               task: create
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to associate the task with',
		type: 'string',
		required: true,
		default: '',
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
	},
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the task entry - max 250 characters',
		type: 'string',
		required: true,
		default: '',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the task - max 100,000 characters',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	},

	// ----------------------------------------
	//               task: delete
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                task: get
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               task: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
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
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------------
	//               task: update
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to update',
		type: 'string',
		required: true,
		default: '',
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
	},
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
				displayName: 'Contact ID',
				name: 'contactId',
				description: 'ID of the contact to associate the task with',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Completed',
				name: 'completed',
				description: 'Whether the task has been completed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the task - max 100,000 characters',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				description: 'Title of the task entry - max 250 characters',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
