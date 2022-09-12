import { INodeProperties } from 'n8n-workflow';

export const salesActivityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['salesActivity'],
			},
		},
		options: [
			// {
			// 	name: 'Create',
			// 	value: 'create',
			// 	description: 'Create a sales activity',
			// },
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// 	description: 'Delete a sales activity',
			// },
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a sales activity',
				action: 'Get a sales activity',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all sales activities',
				action: 'Get many sales activities',
			},
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update a sales activity',
			// },
		],
		default: 'get',
	},
];

export const salesActivityFields: INodeProperties[] = [
	// ----------------------------------------
	//          salesActivity: create
	// ----------------------------------------
	{
		displayName: 'Sales Activity Type Name or ID',
		name: 'sales_activity_type_id',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getSalesActivityTypes',
		},
		description:
			'ID of a sales activity type for which the sales activity is created. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the sales activity to create',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Owner Name or ID',
		name: 'ownerId',
		description:
			'ID of the user who owns the sales activity. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'from_date',
		description: 'Timestamp that denotes the end of sales activity',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'end_date',
		description: 'Timestamp that denotes the end of sales activity',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target Type',
		name: 'targetableType',
		description: 'Type of the entity for which the sales activity is created',
		type: 'options',
		required: true,
		default: 'Contact',
		options: [
			{
				name: 'Contact',
				value: 'Contact',
			},
			{
				name: 'Deal',
				value: 'Deal',
			},
			{
				name: 'Sales Account',
				value: 'SalesAccount',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target ID',
		name: 'targetable_id',
		description:
			'ID of the entity for which the sales activity is created. The type of entity is selected in "Target Type".',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['create'],
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
				resource: ['salesActivity'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the sales activity. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				description: 'Latitude of the location when you check in on a sales activity',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the sales activity',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				description: 'Longitude of the location when you check in for a sales activity',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Description about the sales activity',
			},
			{
				displayName: 'Sales Activity Outcome Name or ID',
				name: 'sales_activity_outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of a sales activity\'s outcome. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},

	// ----------------------------------------
	//          salesActivity: delete
	// ----------------------------------------
	{
		displayName: 'Sales Activity ID',
		name: 'salesActivityId',
		description: 'ID of the salesActivity to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//            salesActivity: get
	// ----------------------------------------
	{
		displayName: 'Sales Activity ID',
		name: 'salesActivityId',
		description: 'ID of the salesActivity to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//          salesActivity: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['getAll'],
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
				resource: ['salesActivity'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//          salesActivity: update
	// ----------------------------------------
	{
		displayName: 'Sales Activity ID',
		name: 'salesActivityId',
		description: 'ID of the salesActivity to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['salesActivity'],
				operation: ['update'],
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
				resource: ['salesActivity'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the sales activity. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Start Date',
				name: 'end_date',
				description: 'Timestamp that denotes the start of the sales activity',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'string',
				default: '',
				description: 'Latitude of the location when you check in on a sales activity',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the sales activity',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'string',
				default: '',
				description: 'Longitude of the location when you check in for a sales activity',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Description about the sales activity',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who owns the sales activity. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Sales Activity Outcome Name or ID',
				name: 'sales_activity_outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of a sales activity\'s outcome. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Sales Activity Type Name or ID',
				name: 'sales_activity_type_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getSalesActivityTypes',
				},
				description:
					'ID of a sales activity type for which the sales activity is updated. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Start Date',
				name: 'from_date',
				description: 'Timestamp that denotes the start of the sales activity',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Target ID',
				name: 'targetable_id',
				type: 'string',
				default: '',
				description:
					'ID of the entity for which the sales activity is updated. The type of entity is selected in "Target Type".',
			},
			{
				displayName: 'Target Type',
				name: 'targetable_type',
				type: 'options',
				default: 'Contact',
				description: 'Type of the entity for which the sales activity is updated',
				options: [
					{
						name: 'Contact',
						value: 'Contact',
					},
					{
						name: 'Deal',
						value: 'Deal',
					},
					{
						name: 'SalesAccount',
						value: 'SalesAccount',
					},
				],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the sales activity to update',
			},
		],
	},
];
