import {
	INodeProperties,
} from 'n8n-workflow';

export const paymentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				description: 'Get all payments.',
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				description: 'Reschedule payment.',
			}
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const paymentFields = [

/* -------------------------------------------------------------------------- */
/*                                 payment:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'A specific user subscription ID.',
	},
	{
		displayName: 'Plan',
		name: 'planId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Filter: The product/plan ID (single or comma-separated values).',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 1,
		required: true,
		typeOptions: {
			minValue: 1,
			maxValue: 200
		},
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Number of subscription records to return per page.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'user',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'active',
				description: 'Filter: The user subscription status. Returns all active, past_due, trialing and paused subscription plans if not specified.',
				options: [
					{
						name: 'Active',
						value: 'active'
					},
					{
						name: 'Past Due',
						value: 'past_due'
					},
					{
						name: 'Paused',
						value: 'paused'
					},
					{
						name: 'Trialing',
						value: 'trialing'
					},
				]
			},
			{
				displayName: 'Is Paid',
				name: 'isPaid',
				type: 'boolean',
				default: false,
				description: 'Payment is paid.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'DateTime',
				default: '',
				description: 'Payments starting from date.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'DateTime',
				default: '',
				description: 'Payments up until date.',
			},
			{
				displayName: 'One off charge',
				name: 'isOneOffCharge',
				type: 'boolean',
				default: false,
				description: 'Payment is paid.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 payment:reschedule                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'The upcoming subscription payment ID.', // Use loadoptions to select payment
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'DateTime',
		default: '',
		description: 'Date you want to move the payment to.',
	},
] as INodeProperties[];
