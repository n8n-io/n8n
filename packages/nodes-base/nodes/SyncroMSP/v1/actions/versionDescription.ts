import {
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as customer from './customer';
import * as ticket from './ticket';

export const versionDescription: INodeTypeDescription = {
	displayName: 'SyncroMSP',
	name: 'syncromsp',
	icon: 'file:syncromsp.png',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Gets data from SyncroMSP',
	defaults: {
		name: 'SyncroMSP',
		color: '#000000',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'syncroMspApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{
					name: 'Customer',
					value: 'customer',
				},
				{
					name: 'Ticket',
					value: 'ticket',
				},
			],
			default: 'customer',
			description: 'The resource to operate on',
		},
		...customer.descriptions,
		...ticket.descriptions,
	],
};
