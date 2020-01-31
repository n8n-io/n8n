import { INodeProperties } from "n8n-workflow";

export const clientOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a client',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all clients',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a client`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const clientFields = [

/* -------------------------------------------------------------------------- */
/*                                client:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'client',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your clients.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'client',
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
				'client',
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
			description: 'Pass true to only return active clients and false to return inactive clients.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'dateTime',
			default: '',
			description: 'Only return clients that have been updated since the given date and time.',
		}
	]
},

/* -------------------------------------------------------------------------- */
/*                                client:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Client Id',
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
				'client',
			],
		},
	},
	description: 'The ID of the client you are retrieving.',
},

/* -------------------------------------------------------------------------- */
/*                                client:delete                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Client Id',
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
				'client',
			],
		},
	},
	description: 'The ID of the client you want to delete.',
}

] as INodeProperties[];
