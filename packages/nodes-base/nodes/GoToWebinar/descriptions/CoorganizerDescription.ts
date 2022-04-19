import {
	INodeProperties,
} from 'n8n-workflow';

export const coorganizerOperations: INodeProperties[] = [
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
					'coorganizer',
				],
			},
		},
	},
];

export const coorganizerFields: INodeProperties[] = [
	// ----------------------------------
	//         coorganizer: create
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
		description: 'Key of the webinar that the co-organizer is hosting.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Is External',
		name: 'isExternal',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the co-organizer has no GoToWebinar account.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Organizer Key',
		name: 'organizerKey',
		type: 'string',
		default: '',
		description: 'The co-organizer\'s organizer key for the webinar.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'create',
				],
				isExternal: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Given Name',
		name: 'givenName',
		type: 'string',
		default: '',
		description: 'The co-organizer\'s given name.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'create',
				],
				isExternal: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: 'The co-organizer\'s email address.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'create',
				],
				isExternal: [
					true,
				],
			},
		},
	},

	// ----------------------------------
	//         coorganizer: delete
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
		description: 'Key of the webinar to delete.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Co-Organizer Key',
		name: 'coorganizerKey',
		type: 'string',
		default: '',
		description: 'Key of the co-organizer to delete.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Is External',
		name: 'isExternal',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'delete',
				],
			},
		},
		description: `By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.`,
	},

	// ----------------------------------
	//        coorganizer: getAll
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
		description: 'Key of the webinar to retrieve all co-organizers from.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
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
					'coorganizer',
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
					'coorganizer',
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
	//      coorganizer: reinvite
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: `By default only internal co-organizers (with a GoToWebinar account) can be deleted. If you want to use this call for external co-organizers you have to set this parameter to 'true'.`,
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
	{
		displayName: 'Co-Organizer Key',
		name: 'coorganizerKey',
		type: 'string',
		default: '',
		description: 'Key of the co-organizer to reinvite.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
	{
		displayName: 'Is External',
		name: 'isExternal',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the co-organizer has no GoToWebinar account.',
		displayOptions: {
			show: {
				resource: [
					'coorganizer',
				],
				operation: [
					'reinvite',
				],
			},
		},
	},
];
