import {
	INodeProperties,
} from 'n8n-workflow';

export const panelistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Reinvite',
				value: 'reinvite',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
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
		description: 'Name of the panelist to create.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		description: 'Email address of the panelist to create.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description: 'Key of the webinar that the panelist will present at.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------
	//        panelist: getAll
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description: 'Key of the webinar to retrieve all panelists from.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------
	//        panelist: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description: 'Key of the webinar to delete the panelist from.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the panelist to delete.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//        panelist: reinvite
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description: 'Key of the webinar to reinvite the panelist to.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
	{
		displayName: 'Panelist Key',
		name: 'panelistKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the panelist to reinvite.',
		displayOptions: {
			show: {
				resource: [
					'panelist',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
];
