import {
	TicketProperties,
} from '../../Interfaces';

export const ticketDeleteDescription: TicketProperties = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Delete a specific customer by ID',
	},
];
