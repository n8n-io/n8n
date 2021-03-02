import {
	INodeProperties,
} from 'n8n-workflow';

export const recipientOperations = [
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
				name: 'Delete',
				value: 'delete',
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
					'recipient',
				],
			},
		},
	},
] as INodeProperties[];

export const recipientFields = [
	// ----------------------------------
	//         recipient: create
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
		description: 'ID of the user profile to create this recipient under.',
		displayOptions: {
			show: {
				resource: [
					'recipient',
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
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'EUR',
				value: 'EUR',
			},
			{
				name: 'USD',
				value: 'USD',
			},
		],
		description: 'Code of the source currency for transfers to this recipient.',
		displayOptions: {
			show: {
				resource: [
					'recipient',
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
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'EUR',
				value: 'EUR',
			},
			{
				name: 'USD',
				value: 'USD',
			},
		],
		description: 'Code of the target currency for transfers to this recipient.',
		displayOptions: {
			show: {
				resource: [
					'recipient',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Inside Europe',
		name: 'insideEurope',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether both accounts in the transfers to this recipient are inside Europe.',
		displayOptions: {
			show: {
				resource: [
					'recipient',
				],
				operation: [
					'create',
				],
			},
		},
	},
] as INodeProperties[];
