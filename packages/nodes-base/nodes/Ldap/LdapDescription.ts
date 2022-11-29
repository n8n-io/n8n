import { INodeProperties } from 'n8n-workflow';

export const ldapFields: INodeProperties[] = [
	// ----------------------------------
	//         Common
	// ----------------------------------
	{
		displayName: 'DN',
		name: 'dn',
		type: 'string',
		default: '',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: ['compare', 'create', 'delete', 'rename', 'modify'],
			},
		},
		description: 'The DN of the entry',
	},
	// ----------------------------------
	//         Compare
	// ----------------------------------
	{
		displayName: 'Attribute ID',
		name: 'id',
		type: 'string',
		default: '',
		description: 'The attribute ID of the attribute to compare',
		required: true,
		displayOptions: {
			show: {
				operation: ['compare'],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		description: 'The value to compare',
		displayOptions: {
			show: {
				operation: ['compare'],
			},
		},
	},
	// ----------------------------------
	//         Rename
	// ----------------------------------
	{
		displayName: 'Target DN',
		name: 'targetDn',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['rename'],
			},
		},
		description: 'The new DN for the entry',
	},
	// ----------------------------------
	//         Create
	// ----------------------------------
	{
		displayName: 'Attributes',
		name: 'attributes',
		placeholder: 'Add Attributes',
		description: 'Add attributes to an object',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'attribute',
				displayName: 'Attribute',
				values: [
					{
						displayName: 'Attribute ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The attribute ID of the attribute to add',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute to set',
					},
				],
			},
		],
	},
	// ----------------------------------
	//         Modify
	// ----------------------------------
	{
		displayName: 'Modify Attribute',
		name: 'attributes',
		placeholder: 'Modify Attribute',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		displayOptions: {
			show: {
				operation: ['modify'],
			},
		},
		description: 'Modify object attributes',
		default: {},
		options: [
			{
				name: 'add',
				displayName: 'Add',
				values: [
					{
						displayName: 'Attribute ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The attribute ID of the attribute to add',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute to set',
					},
				],
			},
			{
				name: 'replace',
				displayName: 'Replace',
				values: [
					{
						displayName: 'Attribute ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The attribute ID of the attribute to replace',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute to replace',
					},
				],
			},
			{
				name: 'delete',
				displayName: 'Remove',
				values: [
					{
						displayName: 'Attribute ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The attribute ID of the attribute to remove',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute to remove',
					},
				],
			},
		],
	},
	// ----------------------------------
	//         Search
	// ----------------------------------
	{
		displayName: 'Base DN',
		name: 'baseDN',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		description: 'The subtree to search in',
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'string',
		default: '(objectclass=*)',
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		description: `LDAP filter. Escape these chars * ( ) \\ with a backslash '\\'.`,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				operation: ['search'],
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
				operation: ['search'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				type: 'string',
				default: '',
				description: 'Comma-separated list of attributes to return',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 1000,
				typeOptions: {
					minValue: 0,
				},
				description:
					'Maximum number of results to request at one time. Set to 0 to disable paging.',
			},
			{
				displayName: 'Scope',
				name: 'scope',
				default: 'sub',
				description:
					'The set of entries at or below the BaseDN that may be considered potential matches',
				type: 'options',
				options: [
					{
						name: 'Base Object',
						value: 'base',
					},
					{
						name: 'Single Level',
						value: 'one',
					},
					{
						name: 'Whole Subtree',
						value: 'sub',
					},
				],
			},
		],
	},
];
