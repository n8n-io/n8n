import { INodeProperties } from "n8n-workflow";

export const projectOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a project',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all projects',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const projectFields = [

/* -------------------------------------------------------------------------- */
/*                                projects:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'project',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your projects.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'project',
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
				'project',
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
			type: 'string',
			default: '',
			description: 'Pass true to only return active projects and false to return inactive projects.',
		},
		{
			displayName: 'Client Id',
			name: 'client_id',
			type: 'string',
			default: '',
			description: 'Only return projects belonging to the client with the given ID.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'string',
			default: '',
			description: 'Only return projects by updated_since.',
		},
		{
			displayName: 'Page',
			name: 'page',
			type: 'string',
			default: '',
			description: 'The page number to use in pagination.',
		},

	]
},

/* -------------------------------------------------------------------------- */
/*                                project:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Project Id',
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
				'project',
			],
		},
	},
	description: 'The ID of the project you are retrieving.',
}

] as INodeProperties[];
