import {
	TicketProperties,
} from '../../Interfaces';

export const ticketGetTicketDescription: TicketProperties = [
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation:[
					'getTicket',
				],
			},
		},
		default: '',
		description: 'Get specific customer by ID',
	},
];
