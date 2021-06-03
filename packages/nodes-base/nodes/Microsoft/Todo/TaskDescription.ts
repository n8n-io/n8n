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
				description: 'Create a task list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get All a task list',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task list',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const taskFields = [

/* -------------------------------------------------------------------------- */
/*                                 task:create                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task List ID',
		name: 'taskListId',
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
		description: 'Task list ID.',
	},
	{
		displayName: 'Task Title',
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
				displayName: 'Body',
				name: 'bodyUI',
				type: 'fixedCollection',
				placeholder: 'Add Task Body',
				options: [
					{
						displayName: 'Body',
						name: 'body',
						values: [
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'The task note content'
							},
							{
								displayName: 'Content Type',
								name: 'contentType',
								type: 'options',
								options: [
									{
										name: 'Text',
										value: 'text',
									},
									{
										name: 'HTML',
										value: 'html',
									},
								],
								default: 'text',
								description: 'The task note content type'
							},
						],
					}
				],
				default: '',
				description: 'Task note content.',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name:'Low',
						value: 'low',
					},
					{
							name:'Normal',
							value: 'normal',
					},
					{
							name:'High',
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
						name:'Notstarted',
						value: 'notStarted'
					},
					{
							name:'In progress',
							value: 'inProgress'
					},
					{
							name:'Completed',
							value: 'completed'
					},
					{
							name:'Waiting On Others',
							value: 'waitingOnOthers'
					},
					{
							name:'Deferred',
							value: 'deferred'
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task..',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 task:get/delete/update/getAll              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task List ID',
		name: 'taskListId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
					'getAll',
					'delete',
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'Task List ID',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'Task ID',
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
/*                                 task:update                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		required: true,
		default: '',
		description: 'A brief updated description of the task.',
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
				displayName: 'Body',
				name: 'bodyUI',
				type: 'fixedCollection',
				placeholder: 'Add Task Body',
				options: [
					{
						displayName: 'Body',
						name: 'body',
						values: [
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'The task note content'
							},
							{
								displayName: 'Content Type',
								name: 'contentType',
								type: 'options',
								options: [
									{
										name: 'Text',
										value: 'text',
									},
									{
										name: 'HTML',
										value: 'html',
									},
								],
								default: 'text',
								description: 'The task note content type'
							},
						],
					}
				],
				default: '',
				description: 'Task note content.',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name:'Low',
						value: 'low',
					},
					{
							name:'Normal',
							value: 'normal',
					},
					{
							name:'High',
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
						name:'Notstarted',
						value: 'notStarted'
					},
					{
							name:'In progress',
							value: 'inProgress'
					},
					{
							name:'Completed',
							value: 'completed'
					},
					{
							name:'Waiting On Others',
							value: 'waitingOnOthers'
					},
					{
							name:'Deferred',
							value: 'deferred'
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task.',
			},
		],
	},
] as INodeProperties[];
