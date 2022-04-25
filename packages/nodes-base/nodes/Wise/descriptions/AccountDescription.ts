import {
	INodeProperties,
} from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getBalances',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get Balances',
				value: 'getBalances',
				description: 'Retrieve balances for all account currencies of this user.',
			},
			{
				name: 'Get Currencies',
				value: 'getCurrencies',
				description: 'Retrieve currencies in the borderless account of this user.',
			},
			{
				name: 'Get Statement',
				value: 'getStatement',
				description: 'Retrieve the statement for the borderless account of this user.',
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
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile to retrieve the balance of.',
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
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile whose account to retrieve the statement of.',
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
		displayName: 'Borderless Account ID',
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
		description: 'ID of the borderless account to retrieve the statement of.',
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
		description: 'Code of the currency of the borderless account to retrieve the statement of.',
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
				description: 'Line style to retrieve the statement in.',
				options: [
					{
						name: 'Compact',
						value: 'COMPACT',
						description: 'Single line per transaction.',
					},
					{
						name: 'Flat',
						value: 'FLAT',
						description: 'Separate lines for transaction fees.',
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
