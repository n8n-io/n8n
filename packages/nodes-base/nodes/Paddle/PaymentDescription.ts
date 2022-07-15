import {
	INodeProperties,
} from 'n8n-workflow';

export const paymentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all payment',
				action: 'Get all payments',
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				description: 'Reschedule payment',
				action: 'Reschedule a payment',
			},
		],
		default: 'getAll',
	},
];

export const paymentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 payment:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'payment',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'payment',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'Attributes in JSON form',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Date From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Payment starting from date',
			},
			{
				displayName: 'Date To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Payment up until date',
			},
			{
				displayName: 'Is Paid',
				name: 'isPaid',
				type: 'boolean',
				default: false,
				description: 'Whether payment is paid',
			},
			{
				displayName: 'Plan ID',
				name: 'plan',
				type: 'string',
				default: '',
				description: 'Filter: The product/plan ID (single or comma-separated values)',
			},
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'number',
				default: '',
				description: 'A specific user subscription ID',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'active',
				description: 'Filter: The user subscription status. Returns all active, past_due, trialing and paused subscription plans if not specified.',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Past Due',
						value: 'past_due',
					},
					{
						name: 'Paused',
						value: 'paused',
					},
					{
						name: 'Trialing',
						value: 'trialing',
					},
				],
			},
			{
				displayName: 'One Off Charge',
				name: 'isOneOffCharge',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 payment:reschedule                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment Name or ID',
		name: 'paymentId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getpayment',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'reschedule',
				],
			},
		},
		description: 'The upcoming subscription payment ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'reschedule',
				],
			},
		},
		description: 'Date you want to move the payment to',
	},
];
