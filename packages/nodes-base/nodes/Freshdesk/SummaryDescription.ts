import type { INodeProperties } from 'n8n-workflow';

export const summaryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['summary'],
			},
		},
		// View Summary // GET // summary
		// Update Summary // PUT // summary
		// Delete Summary // DELETE // summary

		options: [
			{
				name: 'Get Summary',
				value: 'get',
				action: 'Get summary',
			},
			{
				name: 'Set Summary',
				value: 'set',
				action: 'Set summary',
			},
			{
				name: 'Delete Summary',
				value: 'delete',
				action: 'Delete summary',
			},
		],
		default: 'get',
	},
];

export const summaryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                       summary:get // summary:delete                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['summary'],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                summary:set                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['set'],
				resource: ['summary'],
			},
		},
		required: true,
	},
	{
		displayName: 'Summary',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['set'],
				resource: ['summary'],
			},
		},
		required: true,
	},
];
