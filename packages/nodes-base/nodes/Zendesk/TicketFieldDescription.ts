import {
	INodeProperties,
 } from 'n8n-workflow';

export const ticketFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ticketField',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket field',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all system and custom ticket fields',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
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
				resource: [
					'ticketField',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ticketField ID',
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
				resource: [
					'ticketField',
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
					'ticketField',
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
];
