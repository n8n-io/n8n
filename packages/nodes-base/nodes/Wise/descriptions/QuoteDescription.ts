import {
	INodeProperties,
} from 'n8n-workflow';

export const quoteOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
			},
		},
	},
] as INodeProperties[];

export const quoteFields = [
	// ----------------------------------
	//         quote: create
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
		description: 'ID of the user profile to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Source Amount',
		name: 'sourceAmount',
		type: 'number',
		default: 0,
		description: 'Code of the source (sending) currency for the quote to create.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Source Currency',
		name: 'sourceCurrency',
		type: 'string',
		default: '',
		description: 'Code of the source (sending) currency for the quote to create.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Target Amount',
		name: 'targetAmount',
		type: 'number',
		default: 0,
		description: 'Code of the target (receiving) currency for the quote to create.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Target Currency',
		name: 'targetCurrency',
		type: 'string',
		default: '',
		description: 'Code of the target (receiving) currency for the quote to create.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
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
		description: 'ID of the quote to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
