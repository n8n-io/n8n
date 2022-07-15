import {
	INodeProperties,
} from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an activity for a member',
				action: 'Create an activity',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all activities',
				action: 'Get all activities',
			},
		],
		default: 'create',
	},
];

export const activityFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                activity:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Activity Type Name or ID',
				name: 'activityType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getActivityTypes',
				},
				default: '',
				description: 'A user-defined way to group activities of the same nature. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the activity; displayed in the timeline',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				description: 'Supply a key that must be unique or leave blank to have one generated',
			},
			{
				displayName: 'Link',
				name: 'link',
				type: 'string',
				default: '',
				description: 'A URL for the activity; displayed in the timeline',
			},
			{
				displayName: 'Link Text',
				name: 'linkText',
				type: 'string',
				default: '',
				description: 'The text for the timeline link',
			},
			{
				displayName: 'Occurred At',
				name: 'occurredAt',
				type: 'dateTime',
				default: '',
				description: 'The date and time the activity occurred; defaults to now',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                activity:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
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
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'activity',
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
					'activity',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Member ID',
				name: 'memberId',
				type: 'string',
				default: '',
				description: 'When set the post will be filtered by the member ID',
			},
		],
	},
];
