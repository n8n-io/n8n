import {
	INodeProperties,
} from 'n8n-workflow';

export const requesterGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'requesterGroup',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a requester group',
				action: 'Create a requester group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a requester group',
				action: 'Delete a requester group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a requester group',
				action: 'Get a requester group',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all requester groups',
				action: 'Get all requester groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a requester group',
				action: 'Update a requester group',
			},
		],
		default: 'create',
	},
];

export const requesterGroupFields: INodeProperties[] = [
	// ----------------------------------------
	//          requesterGroup: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'requesterGroup',
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
					'requesterGroup',
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
			},
		],
	},

	// ----------------------------------------
	//          requesterGroup: delete
	// ----------------------------------------
	{
		displayName: 'Requester Group ID',
		name: 'requesterGroupId',
		description: 'ID of the requester group to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'requesterGroup',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//           requesterGroup: get
	// ----------------------------------------
	{
		displayName: 'Requester Group ID',
		name: 'requesterGroupId',
		description: 'ID of the requester group to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'requesterGroup',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//          requesterGroup: getAll
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
					'requesterGroup',
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
					'requesterGroup',
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
	//          requesterGroup: update
	// ----------------------------------------
	{
		displayName: 'Requester Group ID',
		name: 'requesterGroupId',
		description: 'ID of the requester group to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'requesterGroup',
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
					'requesterGroup',
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
				description: 'Description of the requester group',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the requester group',
			},
		],
	},
];
