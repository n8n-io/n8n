import { INodeProperties } from 'n8n-workflow';

export const personOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['person'],
			},
		},
		options: [
			{
				name: 'Enrich',
				value: 'enrich',
				action: 'Enrich a person',
			},
		],
		default: 'enrich',
	},
];

export const personFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 person:enrich                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['enrich'],
			},
		},
		description: 'Email address (e.g – mbenioff@salesforce.com)',
	},
	{
		displayName: 'Fist Name',
		name: 'firstname',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['enrich'],
			},
		},
		description: 'First name of the person (e.g – Marc)',
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['enrich'],
			},
		},
		description: 'Last name of the person (e.g – Benioff)',
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['enrich'],
			},
		},
		description: 'The domain name (e.g – salesforce.com)',
	},
];
