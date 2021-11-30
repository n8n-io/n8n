
import * as getAll from './getAll';
import * as addTicket from './addTicket';
import * as getTicket from './getTicket';
import * as deleteTicket from './deleteTicket';
import * as updateTicket from './updateTicket';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	addTicket,
	getTicket,
	deleteTicket,
	updateTicket,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'addTicket',
				description: 'Add new ticket',
			},
			{
				name: 'Delete',
				value: 'deleteTicket',
				description: 'Delete ticket',
			},
			{
				name: 'Get',
				value: 'getTicket',
				description: 'Retrieve ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tickets',
			},
			{
				name: 'Update',
				value: 'updateTicket',
				description: 'Update ticket',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...addTicket.description,
	...getTicket.description,
	...deleteTicket.description,
	...updateTicket.description,
] as INodeProperties[];
