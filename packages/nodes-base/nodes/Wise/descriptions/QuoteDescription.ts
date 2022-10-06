import { INodeProperties } from 'n8n-workflow';

export const quoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a quote',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a quote',
			},
		],
		displayOptions: {
			show: {
				resource: ['quote'],
			},
		},
	},
];

export const quoteFields: INodeProperties[] = [
	// ----------------------------------
	//         quote: create
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
		description:
			'ID of the user profile to create the quote under. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target Account Name or ID',
		name: 'targetAccountId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getRecipients',
		},
		description:
			'ID of the account that will receive the funds. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount Type',
		name: 'amountType',
		type: 'options',
		default: 'source',
		options: [
			{
				name: 'Source',
				value: 'source',
			},
			{
				name: 'Target',
				value: 'target',
			},
		],
		description: 'Whether the amount is to be sent or received',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
		},
		description: 'Amount of funds for the quote to create',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Source Currency',
		name: 'sourceCurrency',
		type: 'string',
		default: '',
		description: 'Code of the currency to send for the quote to create',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target Currency',
		name: 'targetCurrency',
		type: 'string',
		default: '',
		description: 'Code of the currency to receive for the quote to create',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------
	//         quote: get
	// ----------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the quote to retrieve',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['get'],
			},
		},
	},
];
