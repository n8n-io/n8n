import {
	INodeProperties,
} from 'n8n-workflow';

export const paymentsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'payments',
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

export const paymentsFields = [
/* -------------------------------------------------------------------------- */
/*                                 payments:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'payments',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'payments',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: `Attributes in JSON form.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'payments',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					false
				]
			},
		},
		default: {},
		options: [
			{
				displayName: 'Date From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'payments starting from date.',
			},
			{
				displayName: 'Date To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'payments up until date.',
			},
			{
				displayName: 'Is Paid',
				name: 'isPaid',
				type: 'boolean',
				default: false,
				description: 'payment is paid.',
			},
			{
				displayName: 'Plan',
				name: 'plan',
				type: 'string',
				default: '',
				description: 'Filter: The product/plan ID (single or comma-separated values).',
			},
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'number',
				default: '',
				description: 'A specific user subscription ID.',
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
				displayName: 'One off charge',
				name: 'isOneOffCharge',
				type: 'boolean',
				default: false,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 payments:reschedule                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'payments ID',
		name: 'paymentsId',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'payments',
				],
				operation: [
					'reschedule',
				],
			},
		},
		description: 'The upcoming subscription payments ID.', // Use loadoptions to select payments
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'payments',
				],
				operation: [
					'reschedule',
				],
			},
		},
		description: 'Date you want to move the payments to.',
	},
] as INodeProperties[];
