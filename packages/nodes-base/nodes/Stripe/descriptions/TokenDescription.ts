import {
	INodeProperties,
} from 'n8n-workflow';

export const tokenOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a token',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'token',
				],
			},
		},
	},
];

export const tokenFields: INodeProperties[] = [
	// ----------------------------------
	//          token: create
	// ----------------------------------
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'cardToken',
		description: 'Type of token to create',
		options: [
			{
				name: 'Card Token',
				value: 'cardToken',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'token',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Card Number',
		name: 'number',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'token',
				],
				operation: [
					'create',
				],
				type: [
					'cardToken',
				],
			},
		},
		placeholder: '4242424242424242',
		default: '',
	},
	{
		displayName: 'CVC',
		name: 'cvc',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'token',
				],
				operation: [
					'create',
				],
				type: [
					'cardToken',
				],
			},
		},
		default: '',
		placeholder: '314',
		description: 'Security code printed on the back of the card',
	},
	{
		displayName: 'Expiration Month',
		description: 'Number of the month when the card will expire',
		name: 'expirationMonth',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'token',
				],
				operation: [
					'create',
				],
				type: [
					'cardToken',
				],
			},
		},
		default: '',
		placeholder: '10',
	},
	{
		displayName: 'Expiration Year',
		description: 'Year when the card will expire',
		name: 'expirationYear',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'token',
				],
				operation: [
					'create',
				],
				type: [
					'cardToken',
				],
			},
		},
		default: '',
		placeholder: '2022',
	},
];
