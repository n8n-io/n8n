import { INodeProperties } from "n8n-workflow";

export const expenseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'expense',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an expense',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all expenses',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete an expense`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const expenseFields = [

/* -------------------------------------------------------------------------- */
/*                                expense:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'expense',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your expenses.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'expense',
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
				'expense',
			],
			operation: [
				'getAll',
			],
		},
	},
	options: [
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the user with the given ID.',
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the client with the given ID.',
		},
		{
			displayName: 'Project ID',
			name: 'project_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the client with the given ID.',
		},
		{
			displayName: 'Is Billed',
			name: 'is_billed',
			type: 'boolean',
			default: '',
			description: 'Pass true to only return time entries that have been invoiced and false to return time entries that have not been invoiced.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'dateTime',
			default: '',
			description: 'Only return time entries that have been updated since the given date and time.',
		},
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			description: 'Only return time entries with a spent_date on or after the given date.',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			description: 'Only return time entries with a spent_date on or before the given date.',
		},
		{
			displayName: 'Page',
			name: 'page',
			type: 'number',
			typeOptions: {
				minValue: 1,
			},
			default: 1,
			description: 'The page number to use in pagination. For instance, if you make a list request and receive 100 records, your subsequent call can include page=2 to retrieve the next page of the list. (Default: 1)',
		}
	]
},

/* -------------------------------------------------------------------------- */
/*                                expense:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Expense Id',
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
				'expense',
			],
		},
	},
	description: 'The ID of the expense you are retrieving.',
},

/* -------------------------------------------------------------------------- */
/*                                expense:delete                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Expense Id',
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
				'expense',
			],
		},
	},
	description: 'The ID of the expense you want to delete.',
}

] as INodeProperties[];
