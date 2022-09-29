import { INodeProperties } from 'n8n-workflow';

export const ticketFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ticketField'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket field',
				action: 'Get a ticket field',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many system and custom ticket fields',
				action: 'Get many ticket fields',
			},
		],
		default: 'get',
	},
];

export const ticketFieldFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 ticketField:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket Field ID',
		name: 'ticketFieldId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticketField'],
				operation: ['get'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 ticketField:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['ticketField'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['ticketField'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
