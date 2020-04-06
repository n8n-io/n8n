import {
	INodeProperties,
 } from 'n8n-workflow';

export const ticketFieldOperations = [
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
] as INodeProperties[];

export const ticketFieldFields = [

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
] as INodeProperties[];
