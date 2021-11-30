import {
	TicketProperties,
} from '../../Interfaces';

export const ticketUpdateTicketDescription: TicketProperties = [
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'updateTicket',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'updateTicket',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Asset ID',
				name: 'asset_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Customer ID',
				name: 'customer_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Problem Type',
				name: 'problem_type',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ticket Type',
				name: 'ticket_type',
				type: 'string',
				default: '',
			},
		],
	},
];
