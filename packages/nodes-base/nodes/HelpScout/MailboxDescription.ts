import { INodeProperties } from 'n8n-workflow';

export const mailboxOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mailbox',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a mailbox',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all mailboxes',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const mailboxFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                mailbox:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Mailbox ID',
		name: 'mailboxId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mailbox',
				],
				operation: [
					'get',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                mailbox:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'mailbox',
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
				operation: [
					'getAll',
				],
				resource: [
					'mailbox',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
