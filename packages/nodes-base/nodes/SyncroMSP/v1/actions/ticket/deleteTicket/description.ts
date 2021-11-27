import {
	TicketProperties,
} from '../../Interfaces';

export const ticketDeleteDescription: TicketProperties = [
	{
		displayName: 'Ticket Id',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'deleteTicket',
				],
			},
		},
		default: '',
		description: 'Delete a specific customer by id',
	},
];
