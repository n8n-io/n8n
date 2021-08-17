import {
	INodeProperties,
} from 'n8n-workflow';

export const requesterGroupOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				description: 'Create a requesterGroup',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a requesterGroup',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a requesterGroup',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all requesterGroups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a requesterGroup',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const requesterGroupFields = [
	// ----------------------------------------
	//          requesterGroup: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the requester group',
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
				description: 'Description of the requester group',
			},
		],
	},

	// ----------------------------------------
	//          requesterGroup: delete
	// ----------------------------------------
	{
		displayName: 'Requester Group ID',
		name: 'requesterGroupId',
		description: 'ID of the requesterGroup to delete',
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
		description: 'ID of the requesterGroup to retrieve',
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
		description: 'How many results to return',
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
		description: 'ID of the requesterGroup to update',
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
] as INodeProperties[];
