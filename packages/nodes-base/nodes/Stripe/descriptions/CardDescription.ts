import {
	INodeProperties,
} from 'n8n-workflow';

export const cardOperations = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'card',
				],
			},
		},
	},
] as INodeProperties[];

export const cardFields = [
	// ----------------------------------
	//         card: create
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to be associated with this card.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Card Token',
		name: 'token',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'tok_1IMfKdJhRTnqS5TKQVG1LI9o',
		description: 'Token representing sensitive card information.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------
	//         card: delete
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer whose card to delete.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the card to delete.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//         card: get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer whose card to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the source to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'card',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
