import { INodeProperties } from "n8n-workflow";

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Me',
				value: 'me',
				description: 'Get data of authenticated user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a user',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all users',
			},
		],
		default: 'me',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const userFields = [

/* -------------------------------------------------------------------------- */
/*                                user:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'user',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your users.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'user',
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
				'user',
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
			description: 'Pass true to only return active users and false to return inactive users.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'dateTime',
			default: '',
			description: 'Only return users belonging to the user with the given ID.',
		},
		{
			displayName: 'Page',
			name: 'page',
			type: 'number',
			typeOptions: {
				minValue: 1,
			},
			default: 1,
			description: 'The page number to use in pagination..',
		}
	]
},

/* -------------------------------------------------------------------------- */
/*                                user:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'User Id',
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
				'user',
			],
		},
	},
	description: 'The ID of the user you are retrieving.',
}

] as INodeProperties[];
