import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const taskListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all task lists by container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create new task list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get task list by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update task list by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete task list by id',
			},

		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  taskListFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 taskList:getAll                             */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'ID of content container.',
	},
    ...getPagingParameters('taskList'),

	/* -------------------------------------------------------------------------- */
	/*                                 taskList:create                             */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Name of the task list.',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Color of the task list.',
	},
	{
		displayName: 'Hide If Completed',
		name: 'hide_if_completed',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'If the task list should be hidden after completion.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 taskList:get                            	  */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the task list.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 taskList:update                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of the task list.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'update',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the task list.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				default: '',
				description: 'Color of the task list.',
			},
			{
				displayName: 'Hide If Completed',
				name: 'hide_if_completed',
				type: 'boolean',
				default: true,
				description: 'If the task list should be hidden after completion.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 taskList:delete                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the task list.',
	},

] as INodeProperties[];
