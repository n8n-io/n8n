import { INodeProperties } from "n8n-workflow";

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
				name: 'Get',
				value: 'get',
				description: 'Get data of a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all tasks',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a task`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const taskFields = [

/* -------------------------------------------------------------------------- */
/*                                task:getAll                            */
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
	description: 'Returns a list of your tasks.',
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
			returnAll: [
				false,
			],
		},
	},
	typeOptions: {
		minValue: 1,
		maxValue: 100,
	},
	default: 100,
	description: 'How many results to return.',
},
{
	displayName: 'Filters',
	name: 'filters',
	type: 'collection',
	placeholder: 'Add Filter',
	default: {},
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
	options: [
		{
			displayName: 'Is Active',
			name: 'is_active',
			type: 'boolean',
			default: true,
			description: 'Pass true to only return active tasks and false to return inactive tasks.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'dateTime',
			default: '',
			description: 'Only return tasks belonging to the task with the given ID.',
		},
		{
			displayName: 'Page',
			name: 'page',
			type: 'number',
			typeOptions: {
				minValue: 1,
			},
			default: 1,
			description: 'The page number to use in pagination.',
		}
	]
},

/* -------------------------------------------------------------------------- */
/*                                task:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Task Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'get',
			],
			resource: [
				'task',
			],
		},
	},
	description: 'The ID of the task you are retrieving.',
},

/* -------------------------------------------------------------------------- */
/*                                task:delete                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Task Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'delete',
			],
			resource: [
				'task',
			],
		},
	},
	description: 'The ID of the task you wan to delete.',
},


] as INodeProperties[];
