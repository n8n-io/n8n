import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getBalances',
		options: [
			{
				name: 'Get balances',
				value: 'getBalances',
				description: 'Retrieve balances for all account currencies of this user',
				action: 'Get balances',
			},
			{
				name: 'Get currencies',
				value: 'getCurrencies',
				description: 'Retrieve currencies in the borderless account of this user',
				action: 'Get currencies',
			},
			{
				name: 'Get statement',
				value: 'getStatement',
				description: 'Retrieve the statement for the borderless account of this user',
				action: 'Get a statement',
			},
		],
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------
	//      account: getBalances
	// ----------------------------------
	{
		displayName: 'Profile name or ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description:
			'ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getBalances'],
			},
		},
	},

	// ----------------------------------
	//      account: getStatement
	// ----------------------------------
	{
		displayName: 'Profile name or ID',
		name: 'profileId',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description:
			'ID of the user profile whose account to retrieve the statement of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
			},
		},
	},
	{
		displayName: 'Borderless account name or ID',
		name: 'borderlessAccountId',
		type: 'options',
		default: [],
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getBorderlessAccounts',
			loadOptionsDependsOn: ['profileId'],
		},
		description:
			'ID of the borderless account to retrieve the statement of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		// TODO: preload
		description: 'Code of the currency of the borderless account to retrieve the statement of',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
			},
		},
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		default: 'json',
		description: 'File format to retrieve the statement in',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'CSV',
				value: 'csv',
			},
			{
				name: 'PDF',
				value: 'pdf',
			},
			{
				name: 'XML (CAMT.053)',
				value: 'xml',
			},
		],
	},
	{
		displayName: 'Put output file in field',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the file in',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
				format: ['csv', 'pdf', 'xml'],
			},
		},
	},
	{
		displayName: 'File name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'data.pdf',
		description: 'Name of the file that will be downloaded',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
				format: ['csv', 'pdf', 'xml'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getStatement'],
			},
		},
		options: [
			{
				displayName: 'Line style',
				name: 'lineStyle',
				type: 'options',
				default: 'COMPACT',
				description: 'Line style to retrieve the statement in',
				options: [
					{
						name: 'Compact',
						value: 'COMPACT',
						description: 'Single line per transaction',
					},
					{
						name: 'Flat',
						value: 'FLAT',
						description: 'Separate lines for transaction fees',
					},
				],
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'fixedCollection',
				placeholder: 'Add range',
				default: {},
				options: [
					{
						displayName: 'Range properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Range start',
								name: 'intervalStart',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Range end',
								name: 'intervalEnd',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
		],
	},
];
