import {
	TicketProperties,
} from '../../Interfaces';

export const ticketAddTicketDescription: TicketProperties = [
	{
		displayName: 'Customer Id',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'addTicket',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'addTicket',
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
					'addTicket',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Asset Id',
				name: 'asset_id',
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
				displayName: 'Ticket Type',
				name: 'ticket_type',
				type: 'string',
				default: '',
			},
		],
	},
];
