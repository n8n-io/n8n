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
				description: 'Create an activity',
				action: 'Create an activity',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an activity',
				action: 'Delete an activity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an activity',
				action: 'Get an activity',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all activities',
				action: 'Get all activities',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an activity',
				action: 'Update an activity',
			},
		],
		default: 'create',
	},
];

export const activityFields: INodeProperties[] = [
	// ----------------------------------------
	//             activity: create
	// ----------------------------------------
	{
		displayName: 'Activity Type Name or ID',
		name: 'activityTypeId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getActivityTypes',
		},
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
		displayName: 'Contacts',
		name: 'contacts',
		description: 'Comma-separated list of IDs of the contacts to associate the activity with',
		type: 'string',
		required: true,
		default: '',
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
		displayName: 'Happened At',
		name: 'happenedAt',
		description: 'Date when the activity happened',
		type: 'dateTime',
		required: true,
		default: '',
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
		displayName: 'Summary',
		name: 'summary',
		description: 'Brief description of the activity - max 255 characters',
		type: 'string',
		required: true,
		default: '',
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
		default: {},
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
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity - max 100,000 characters',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
	},

	// ----------------------------------------
	//             activity: delete
	// ----------------------------------------
	{
		displayName: 'Activity ID',
		name: 'activityId',
		description: 'ID of the activity to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              activity: get
	// ----------------------------------------
	{
		displayName: 'Activity ID',
		name: 'activityId',
		description: 'ID of the activity to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             activity: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
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
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'activity',
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

	// ----------------------------------------
	//             activity: update
	// ----------------------------------------
	{
		displayName: 'Activity ID',
		name: 'activityId',
		description: 'ID of the activity to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Activity Type Name or ID',
				name: 'activity_type_id',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getActivityTypes',
				},
			},
			{
				displayName: 'Contacts',
				name: 'contacts',
				description: 'IDs of the contacts to associate the activity with',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description to add more details on the activity - max 100,000 characters',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Happened At',
				name: 'happened_at',
				description: 'Date when the activity happened',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				description: 'Brief description of the activity - max 255 characters',
				type: 'string',
				default: '',
			},
		],
	},
];
