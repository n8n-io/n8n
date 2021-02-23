import {
	INodeProperties,
} from 'n8n-workflow';

export const couponOperations = [
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
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
			},
		},
	},
] as INodeProperties[];

export const couponFields = [
	// ----------------------------------
	//       coupon: create
	// ----------------------------------
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'options',
		required: true,
		default: 'once',
		description: 'How long the discount will be in effect.',
		options: [
			{
				name: 'Forever',
				value: 'forever',
			},
			{
				name: 'Once',
				value: 'once',
			},
			{
				name: 'Repeating',
				value: 'repeating',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'percent',
		description: 'Whether the coupon discount is a percentage or a fixed amount.',
		options: [
			{
				name: 'Fixed Amount',
				value: 'fixedAmount',
			},
			{
				name: 'Percent',
				value: 'percent',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Amount Off',
		name: 'amountOff',
		type: 'number',
		required: true,
		default: 0,
		description: 'Amount to subtract from an invoice total.',
		typeOptions: {
			minValue: 0,
			maxValue: 99999999,
		},
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'create',
				],
				type: [
					'fixedAmount',
				],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		required: true,
		default: '',
		description: 'Three-letter ISO currency code, e.g. USD or EUR. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>.',
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'create',
				],
				type: [
					'fixedAmount',
				],
			},
		},
	},
	{
		displayName: 'Percent Off',
		name: 'percentOff',
		type: 'number',
		required: true,
		default: 1,
		description: 'Percentage to apply with the coupon.',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'create',
				],
				type: [
					'percent',
				],
			},
		},
	},

	// ----------------------------------
	//       coupon: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'coupon',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
