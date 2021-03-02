import {
	INodeProperties,
} from 'n8n-workflow';

export const transferOperations = [
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
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
			},
		},
	},
] as INodeProperties[];

export const transferFields = [
	// ----------------------------------
	//         transfer: create
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
			loadOptionsDependsOn: [
				'profileId',
			],
		},
		description: 'ID of the user profile to retrieve the balance of.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the quote based on which to create the transfer.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Target Account ID',
		name: 'targetAccountId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getRecipients',
		},
		description: 'ID of the account that will receive the funds.',
		displayOptions: {
			show: {
				resource: [
					'transfer',
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
		default: {},
		displayOptions: {
			show: {
				resource: [
					'transfer',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description: 'Reference text to show in the recipient\'s bank statement',
			},
		],
	},
] as INodeProperties[];
