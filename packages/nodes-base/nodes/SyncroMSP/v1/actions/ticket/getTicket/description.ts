import {
	TicketProperties,
} from '../../Interfaces';

export const ticketGetTicketDescription: TicketProperties = [
	{
		displayName: 'Ticket Id',
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
		description: 'get specific customer by id',
	},
];
