import {
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as customer from './customer';
import * as ticket from './ticket';
import * as contact from './contact';
import * as rmm from './rmm';

export const versionDescription: INodeTypeDescription = {
	displayName: 'SyncroMSP',
	name: 'syncroMsp',
	icon: 'file:syncromsp.png',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Gets data from SyncroMSP',
	defaults: {
		name: 'SyncroMSP',
		color: '#08a4ab',
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
					name: 'Contact',
					value: 'contact',
				},
				{
					name: 'Customer',
					value: 'customer',
				},
				{
					name: 'RMM',
					value: 'rmm',
				},
				{
					name: 'Ticket',
					value: 'ticket',
				},
			],
			default: 'contact',
			description: 'The resource to operate on',
		},
		...customer.descriptions,
		...ticket.descriptions,
		...contact.descriptions,
		...rmm.descriptions,
	],
};
