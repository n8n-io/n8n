import type { INodeProperties } from 'n8n-workflow';

export const panelistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a panelist',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a panelist',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many panelists',
			},
			{
				name: 'Reinvite',
				value: 'reinvite',
				action: 'Reinvite a panelist',
			},
		],
		displayOptions: {
			show: {
				resource: ['panelist'],
			},
		},
	},
];

export const panelistFields: INodeProperties[] = [
	// ----------------------------------
	//        panelist: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the panelist to create',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		description: 'Email address of the panelist to create',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar that the panelist will present at. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------
	//        panelist: getAll
	// ----------------------------------
	{
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar to retrieve all panelists from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//        panelist: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar to delete the panelist from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the panelist to delete',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//        panelist: reinvite
	// ----------------------------------
	{
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar to reinvite the panelist to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['reinvite'],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the panelist to reinvite',
		displayOptions: {
			show: {
				resource: ['panelist'],
				operation: ['reinvite'],
			},
		},
	},
];
