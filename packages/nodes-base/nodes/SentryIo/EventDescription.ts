import {
	INodeProperties,
} from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get event by ID',
				action: 'Get an event',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
				action: 'Get all events',
			},
		],
		default: 'get',
	},
];

export const eventFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                event:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Project Slug Name or ID',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the project the events belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Full',
		name: 'full',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Whether the event payload will include the full event body, including the stack trace',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                event:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Project Slug Name or ID',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the project the events belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The ID of the event to retrieve (either the numeric primary-key or the hexadecimal ID as reported by the raven client)',
	},
];
