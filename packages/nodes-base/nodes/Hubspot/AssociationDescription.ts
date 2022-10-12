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
				action: 'Create an association',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an association between two objects',
				action: 'Delete an association',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Read an association',
				action: 'Get an association',
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
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'To Object Type Name or ID',
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
		description: 'The type of the target object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		displayName: 'Association Type Name or ID',
		name: 'associationType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
	/*                                association:get                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'To Object Type Name or ID',
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
		description: 'The type of the target object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
