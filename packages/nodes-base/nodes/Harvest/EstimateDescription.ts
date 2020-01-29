import { INodeProperties } from "n8n-workflow";

export const estimateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'estimate',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an estimate',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all estimates',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const estimateFields = [

/* -------------------------------------------------------------------------- */
/*                                estimate:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'estimate',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your estimates.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'estimate',
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
				'estimate',
			],
			operation: [
				'getAll',
			],
		},
	},
	options: [
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the client with the given ID.',
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
			displayName: 'State',
			name: 'state',
			type: 'string',
			default: '',
			description: 'Only return estimates with a state matching the value provided. Options: draft, sent, accepted, or declined.',
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
/*                                estimate:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Estimate Id',
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
				'estimate',
			],
		},
	},
	description: 'The ID of the estimate you are retrieving.',
}

] as INodeProperties[];
