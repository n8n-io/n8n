import {
	INodeProperties,
} from 'n8n-workflow';

export const organisationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'organisation',
				],
			},
		},
		noDataExpression: true,
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
		default: 'create',
	},
];

export const organisationFields: INodeProperties[] = [
	// ----------------------------------------
	//           organisation: create
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
					'organisation',
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
					'organisation',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Created by Email',
				name: 'created_by_email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nationality',
				name: 'nationality',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sector',
				name: 'sector',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User Count',
				name: 'usercount',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},

	// ----------------------------------------
	//           organisation: delete
	// ----------------------------------------
	{
		displayName: 'Organisation ID',
		name: 'organisationId',
		description: 'UUID or numeric ID of the organisation',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'organisation',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//            organisation: get
	// ----------------------------------------
	{
		displayName: 'Organisation ID',
		name: 'organisationId',
		description: 'UUID or numeric ID of the organisation',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'organisation',
				],
				operation: [
					'get',
				],
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
				resource: [
					'organisation',
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
					'organisation',
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
	//           organisation: update
	// ----------------------------------------
	{
		displayName: 'Organisation ID',
		name: 'organisationId',
		description: 'ID of the organisation to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'organisation',
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
					'organisation',
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
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nationality',
				name: 'nationality',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sector',
				name: 'sector',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
			},
		],
	},
];
