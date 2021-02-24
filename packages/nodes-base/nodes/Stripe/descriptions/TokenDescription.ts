import {
	INodeProperties,
} from 'n8n-workflow';

export const tokenOperations = [
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
] as INodeProperties[];

export const tokenFields = [
	// ----------------------------------
	//          token: create
	// ----------------------------------
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'card',
		description: 'Type of token to create.',
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
		displayName: 'Card Fields',
		name: 'cardFields',
		type: 'collection',
		default: {},
		required: true,
		placeholder: 'Add Card Field',
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
		options: [
			{
				displayName: 'Card Number',
				name: 'number',
				type: 'string',
				placeholder: '4242424242424242',
				default: '',
			},
			{
				displayName: 'CVC',
				name: 'cvc',
				type: 'string',
				default: '',
				placeholder: '314',
				description: 'Security code printed on the back of the card.',
			},
			{
				displayName: 'Expiration Month',
				name: 'exp_month',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 12,
				},
				default: 1,
			},
			{
				displayName: 'Expiration Year',
				name: 'exp_year',
				type: 'string',
				default: '',
				placeholder: '2022',
			},
		],
	},
] as INodeProperties[];
