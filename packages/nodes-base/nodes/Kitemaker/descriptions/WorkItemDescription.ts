import {
	INodeProperties,
} from 'n8n-workflow';

export const workItemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform.',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'workItem',
				],
			},
		},
	},
];

export const workItemFields: INodeProperties[] = [
	// ----------------------------------
	//         workItem: create
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'Title of the work item to create.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: [],
		required: true,
		description: 'ID of the space to retrieve the work items from.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Status ID',
		name: 'statusId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['spaceId'],
			loadOptionsMethod: 'getStatuses',
		},
		default: [],
		required: true,
		description: 'ID of the status to set on the item to create.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
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
					'workItem',
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
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Description of the item to create. Markdown supported.',
			},
			{
				displayName: 'Effort',
				name: 'effort',
				type: 'options',
				default: 'SMALL',
				description: 'Effort to set for the item to create.',
				options: [
					{
						name: 'Small',
						value: 'SMALL',
					},
					{
						name: 'Medium',
						value: 'MEDIUM',
					},
					{
						name: 'Large',
						value: 'LARGE',
					},
				],
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'SMALL',
				description: 'Impact to set for the item to create.',
				options: [
					{
						name: 'Small',
						value: 'SMALL',
					},
					{
						name: 'Medium',
						value: 'MEDIUM',
					},
					{
						name: 'Large',
						value: 'LARGE',
					},
				],
			},
			{
				displayName: 'Label IDs',
				name: 'labelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description: 'ID of the label to set on the item to create.',
			},
			{
				displayName: 'Member IDs',
				name: 'memberIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description: 'ID of the user to assign to the item to create.',
			},
		],
	},

	// ----------------------------------
	//         workItem: get
	// ----------------------------------
	{
		displayName: 'Work Item ID',
		name: 'workItemId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the work item to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//         workItem: getAll
	// ----------------------------------
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: [],
		required: true,
		description: 'ID of the space to retrieve the work items from.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
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
					'workItem',
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
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'workItem',
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
	//         workItem: update
	// ----------------------------------
	{
		displayName: 'Work Item ID',
		name: 'workItemId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the work item to update.',
		displayOptions: {
			show: {
				resource: [
					'workItem',
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
					'workItem',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Description of the item to update. Markdown supported.',
			},
			{
				displayName: 'Effort',
				name: 'effort',
				type: 'options',
				default: 'SMALL',
				description: 'Effort to set for the item to update.',
				options: [
					{
						name: 'Small',
						value: 'SMALL',
					},
					{
						name: 'Medium',
						value: 'MEDIUM',
					},
					{
						name: 'Large',
						value: 'LARGE',
					},
				],
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'SMALL',
				description: 'Impact to set for the item to update.',
				options: [
					{
						name: 'Small',
						value: 'SMALL',
					},
					{
						name: 'Medium',
						value: 'MEDIUM',
					},
					{
						name: 'Large',
						value: 'LARGE',
					},
				],
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: [],
				description: 'ID of the status to set on the item to update.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title to set for the work item to update.',
			},
		],
	},
];
