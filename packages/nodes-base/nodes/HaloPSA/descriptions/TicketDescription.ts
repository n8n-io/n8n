import { INodeProperties } from 'n8n-workflow';

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
				operation: ['create', 'update'],
				resource: ['tickets'],
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
				operation: ['create', 'update'],
				resource: ['tickets'],
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
				operation: ['update', 'create'],
				resource: ['tickets'],
			},
		},
		options: [
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
		],
	},
];
