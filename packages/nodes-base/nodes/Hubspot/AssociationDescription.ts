import { INodeProperties } from 'n8n-workflow';

export const associationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['association'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an association between two objects',
			},
			{
				name: 'Define',
				value: 'define',
				description: 'Define a new association',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an association between two objects',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Read an association',
			},
		],
		default: 'get',
	},
];

export const associationFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*               association:create & association:delete                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['create', 'delete'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['create', 'delete'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'To Object Type',
		name: 'toObjectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['create', 'delete'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
		description: 'The type of the target object',
	},
	{
		displayName: 'Target Object ID',
		name: 'toObjectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['create', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the target object',
	},
	{
		displayName: 'Association Type',
		name: 'associationType',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getAssociationTypes',
			loadOptionsDependsOn: ['objectType', 'toObjectType'],
		},
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['create', 'delete'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*               association: define                                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['define'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'To Object Type',
		name: 'toObjectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['define'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
		description: 'The type of the target object',
	},
	{
		displayName: 'Association Name',
		name: 'associationName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['define'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                association:get                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['get'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'To Object Type',
		name: 'toObjectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['get'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
		description: 'The type of the target object',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['association'],
				operation: ['get'],
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
				resource: ['association'],
				operation: ['get'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
