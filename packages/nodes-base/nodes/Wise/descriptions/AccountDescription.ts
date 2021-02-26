import {
	INodeProperties,
} from 'n8n-workflow';

export const accountOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
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
] as INodeProperties[];

export const accountFields = [
	// ----------------------------------
	//         account: get
	// ----------------------------------
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		default: 'balance',
		description: 'Details to retrieve for the account.',
		options: [
			{
				name: 'Balance',
				value: 'balance',
				description: 'Balances for all account currencies of this user.',
			},
			{
				name: 'Currencies',
				value: 'currencies',
				description: 'Currencies in the borderless account of this user.',
			},
			{
				name: 'Statement',
				value: 'statement',
				description: 'Statement for the borderless account of this user.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Profile',
		name: 'profile',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'User profile to retrieve the balance of.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'balance',
				],
			},
		},
	},
	{
		displayName: 'Profile',
		name: 'profile',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'User profile to retrieve the statement of.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
				],
			},
		},
	},
	{
		displayName: 'Borderless Account ID',
		name: 'borderlessAccountId',
		type: 'string',
		default: '',
		description: 'ID of the borderless account to retrieve the statement of.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
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
		description: 'Code of the currency to retrieve the statement in.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
				],
			},
		},
	},
	{
		displayName: 'Interval Start',
		name: 'intervalStart',
		type: 'datetime',
		default: '',
		description: 'Start time of the interval of the statement to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
				],
			},
		},
	},
	{
		displayName: 'Interval End',
		name: 'intervalEnd',
		type: 'datetime',
		default: '',
		description: 'End time of the interval of the statement to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
				],
				details: [
					'statement',
				],
			},
		},
		options: [
			{
				displayName: 'Format',
				name: 'type',
				type: 'options',
				default: 'COMPACT',
				description: 'Format to retrieve the statement in.',
				options: [
					{
						name: 'Compact',
						value: 'COMPACT',
						description: 'Single line per transaction.',
					},
					{
						name: 'Flat',
						value: 'FLAT',
						description: 'Transaction fees on separate lines.',
					},
				],
			},
		],
	},
] as INodeProperties[];
