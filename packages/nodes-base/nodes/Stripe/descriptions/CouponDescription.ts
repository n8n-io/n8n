import type { INodeProperties } from 'n8n-workflow';

export const couponOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a coupon',
				action: 'Create a coupon',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many coupons',
				action: 'Get many coupons',
			},
		],
		displayOptions: {
			show: {
				resource: ['coupon'],
			},
		},
	},
];

export const couponFields: INodeProperties[] = [
	// ----------------------------------
	//       coupon: create
	// ----------------------------------
	{
		displayName: 'Apply',
		name: 'duration',
		type: 'options',
		required: true,
		default: 'once',
		description: 'How long the discount will be in effect',
		options: [
			{
				name: 'Forever',
				value: 'forever',
			},
			{
				name: 'Once',
				value: 'once',
			},
		],
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Discount Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'percent',
		description: 'Whether the coupon discount is a percentage or a fixed amount',
		options: [
			{
				name: 'Fixed Amount (in Cents)',
				value: 'fixedAmount',
			},
			{
				name: 'Percent',
				value: 'percent',
			},
		],
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount Off',
		name: 'amountOff',
		type: 'number',
		required: true,
		default: 0,
		description:
			'Amount in cents to subtract from an invoice total, e.g. enter <code>100</code> for $1.00',
		typeOptions: {
			minValue: 0,
			maxValue: 99999999,
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				type: ['fixedAmount'],
			},
		},
	},
	{
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		required: true,
		default: '',
		description:
			'Three-letter ISO currency code, e.g. <code>USD</code> or <code>EUR</code>. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				type: ['fixedAmount'],
			},
		},
	},
	{
		displayName: 'Percent Off',
		name: 'percentOff',
		type: 'number',
		required: true,
		default: 1,
		description: 'Percentage to apply with the coupon',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				type: ['percent'],
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
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
