import { INodeProperties } from 'n8n-workflow';

const ticketFields: INodeProperties[] = [
	{
		displayName: 'Assigned Agent',
		name: 'agent_id',
		type: 'options',
		default: '',
		noDataExpression: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSAAgents',
		},
	},
	{
		displayName: 'Start Date',
		name: 'startdate',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Target Date',
		name: 'targetdate',
		type: 'dateTime',
		default: '',
	},

];

export const ticketDescription: INodeProperties[] = [
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		description: 'Enter summary',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		default: '',
		description: 'Enter details',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
	},
	// Additional fields =============================================================
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		options: [...ticketFields],
	},
	// Update fields =============================================================
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['ticket'],
			},
		},
		options: [
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
			},
			...ticketFields,
		],
	},
];
