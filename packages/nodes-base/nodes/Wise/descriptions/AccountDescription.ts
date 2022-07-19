import {
	INodeProperties,
} from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getBalances',
		options: [
			{
				name: 'Get Balances',
				value: 'getBalances',
				description: 'Retrieve balances for all account currencies of this user',
				action: 'Get balances',
			},
			{
				name: 'Get Currencies',
				value: 'getCurrencies',
				description: 'Retrieve currencies in the borderless account of this user',
				action: 'Get currencies',
			},
			{
				name: 'Get Statement',
				value: 'getStatement',
				description: 'Retrieve the statement for the borderless account of this user',
				action: 'Get a statement',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'account',
				],
			},
		},
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------
	//      account: getBalances
	// ----------------------------------
	{
		displayName: 'Profile Name or ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getBalances',
				],
			},
		},
	},

	// ----------------------------------
	//      account: getStatement
	// ----------------------------------
	{
		displayName: 'Profile Name or ID',
		name: 'profileId',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile whose account to retrieve the statement of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
			},
		},
	},
	{
		displayName: 'Borderless Account Name or ID',
		name: 'borderlessAccountId',
		type: 'options',
		default: [],
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getBorderlessAccounts',
			loadOptionsDependsOn: [
				'profileId',
			],
		},
		description: 'ID of the borderless account to retrieve the statement of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
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
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
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
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
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
		],
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property to which to write to',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
				format: [
					'csv',
					'pdf',
				],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'data.pdf',
		description: 'Name of the file that will be downloaded',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getStatement',
				],
				format: [
					'csv',
					'pdf',
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
					'account',
				],
				operation: [
					'getStatement',
				],
			},
		},
		options: [
			{
				displayName: 'Line Style',
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
				placeholder: 'Add Range',
				default: {},
				options: [
					{
						displayName: 'Range Properties',
						name: 'rangeProperties',
						values: [
							{
								displayName: 'Range Start',
								name: 'intervalStart',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Range End',
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
