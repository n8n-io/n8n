import type { INodeProperties } from 'n8n-workflow';

export const couponOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['coupon'],
			},
		},
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
			{
				name: 'Update',
				value: 'update',
				description: 'Update a coupon',
				action: 'Update a coupon',
			},
		],
		default: 'create',
	},
];

export const couponFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 coupon:create	                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Coupon Type',
		name: 'couponType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				jsonParameters: [false],
			},
		},
		default: 'checkout',
		description:
			'Either product (valid for specified products or subscription plans) or checkout (valid for any checkout)',
		options: [
			{
				name: 'Checkout',
				value: 'checkout',
			},
			{
				name: 'Product',
				value: 'product',
			},
		],
	},
	{
		displayName: 'Product Names or IDs',
		name: 'productIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getProducts',
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				couponType: ['product'],
				jsonParameters: [false],
			},
		},
		default: [],
		description:
			'Comma-separated list of product IDs. Required if coupon_type is product. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		required: true,
	},
	{
		displayName: 'Discount Type',
		name: 'discountType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				jsonParameters: [false],
			},
		},
		default: 'flat',
		description: 'Either flat or percentage',
		options: [
			{
				name: 'Flat',
				value: 'flat',
			},
			{
				name: 'Percentage',
				value: 'percentage',
			},
		],
	},
	{
		displayName: 'Discount Amount Currency',
		name: 'discountAmount',
		type: 'number',
		default: 1,
		description: 'Discount amount in currency',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				discountType: ['flat'],
				jsonParameters: [false],
			},
		},
	},
	{
		displayName: 'Discount Amount %',
		name: 'discountAmount',
		type: 'number',
		default: 1,
		description: 'Discount amount in percentage',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				discountType: ['percentage'],
				jsonParameters: [false],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'options',
		default: 'EUR',
		description: 'The currency must match the balance currency specified in your account',
		options: [
			{
				name: 'ARS',
				value: 'ARS',
			},
			{
				name: 'AUD',
				value: 'AUD',
			},
			{
				name: 'BRL',
				value: 'BRL',
			},
			{
				name: 'CAD',
				value: 'CAD',
			},
			{
				name: 'CHF',
				value: 'CHF',
			},
			{
				name: 'CNY',
				value: 'CNY',
			},
			{
				name: 'CZK',
				value: 'CZK',
			},
			{
				name: 'DKK',
				value: 'DKK',
			},
			{
				name: 'EUR',
				value: 'EUR',
			},
			{
				name: 'GBP',
				value: 'GBP',
			},
			{
				name: 'HKD',
				value: 'HKD',
			},
			{
				name: 'HUF',
				value: 'HUF',
			},
			{
				name: 'INR',
				value: 'INR',
			},
			{
				name: 'JPY',
				value: 'JPY',
			},
			{
				name: 'KRW',
				value: 'KRW',
			},
			{
				name: 'MXN',
				value: 'MXN',
			},
			{
				name: 'NOK',
				value: 'NOK',
			},
			{
				name: 'NZD',
				value: 'NZD',
			},
			{
				name: 'PLN',
				value: 'PLN',
			},
			{
				name: 'RUB',
				value: 'RUB',
			},
			{
				name: 'SEK',
				value: 'SEK',
			},
			{
				name: 'SGD',
				value: 'SGD',
			},
			{
				name: 'THB',
				value: 'THB',
			},
			{
				name: 'TWD',
				value: 'TWD',
			},
			{
				name: 'USD',
				value: 'USD',
			},
			{
				name: 'ZAR',
				value: 'ZAR',
			},
		],
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
				discountType: ['flat'],
				jsonParameters: [false],
			},
		},
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['create'],
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
				resource: ['coupon'],
				operation: ['create'],
				jsonParameters: [true],
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
				resource: ['coupon'],
				operation: ['create'],
				jsonParameters: [false],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Allowed Uses',
				name: 'allowedUses',
				type: 'number',
				default: 1,
				description:
					'Number of times a coupon can be used in a checkout. This will be set to 999,999 by default, if not specified.',
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'Will be randomly generated if not specified',
			},
			{
				displayName: 'Coupon Prefix',
				name: 'couponPrefix',
				type: 'string',
				default: '',
				description: 'Prefix for generated codes. Not valid if coupon_code is specified.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the coupon. This will be displayed in the Seller Dashboard.',
			},
			{
				displayName: 'Expires',
				name: 'expires',
				type: 'dateTime',
				default: '',
				description: 'The coupon will expire on the date at 00:00:00 UTC',
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				default: '',
				description: 'The name of the coupon group this coupon should be assigned to',
			},
			{
				displayName: 'Number of Coupons',
				name: 'numberOfCoupons',
				type: 'number',
				default: 1,
				description: 'Number of coupons to generate. Not valid if coupon_code is specified.',
			},
			{
				displayName: 'Recurring',
				name: 'recurring',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'If the coupon is used on subscription products, this indicates whether the discount should apply to recurring payments after the initial purchase',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 coupon:getAll	                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['getAll'],
			},
		},
		default: '',
		required: true,
		description: 'The specific product/subscription ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['coupon'],
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
				operation: ['getAll'],
				resource: ['coupon'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 coupon:update	                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update By',
		name: 'updateBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['update'],
				jsonParameters: [false],
			},
		},
		default: 'couponCode',
		description: 'Either flat or percentage',
		options: [
			{
				name: 'Coupon Code',
				value: 'couponCode',
			},
			{
				name: 'Group',
				value: 'group',
			},
		],
	},
	{
		displayName: 'Coupon Code',
		name: 'couponCode',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['update'],
				updateBy: ['couponCode'],
				jsonParameters: [false],
			},
		},
		default: '',
		description: 'Identify the coupon to update',
	},
	{
		displayName: 'Group',
		name: 'group',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['update'],
				updateBy: ['group'],
				jsonParameters: [false],
			},
		},
		default: '',
		description: 'The name of the group of coupons you want to update',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['coupon'],
				operation: ['update'],
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
				resource: ['coupon'],
				operation: ['update'],
				jsonParameters: [true],
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
				resource: ['coupon'],
				operation: ['update'],
				jsonParameters: [false],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Allowed Uses',
				name: 'allowedUses',
				type: 'number',
				default: 1,
				description:
					'Number of times a coupon can be used in a checkout. This will be set to 999,999 by default, if not specified.',
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Discount Properties',
						name: 'discountProperties',
						values: [
							{
								displayName: 'Currency',
								name: 'currency',
								type: 'options',
								default: 'EUR',
								description:
									'The currency must match the balance currency specified in your account',
								displayOptions: {
									show: {
										discountType: ['flat'],
									},
								},
								options: [
									{
										name: 'ARS',
										value: 'ARS',
									},
									{
										name: 'AUD',
										value: 'AUD',
									},
									{
										name: 'BRL',
										value: 'BRL',
									},
									{
										name: 'CAD',
										value: 'CAD',
									},
									{
										name: 'CHF',
										value: 'CHF',
									},
									{
										name: 'CNY',
										value: 'CNY',
									},
									{
										name: 'CZK',
										value: 'CZK',
									},
									{
										name: 'DKK',
										value: 'DKK',
									},
									{
										name: 'EUR',
										value: 'EUR',
									},
									{
										name: 'GBP',
										value: 'GBP',
									},
									{
										name: 'HKD',
										value: 'HKD',
									},
									{
										name: 'HUF',
										value: 'HUF',
									},
									{
										name: 'INR',
										value: 'INR',
									},
									{
										name: 'JPY',
										value: 'JPY',
									},
									{
										name: 'KRW',
										value: 'KRW',
									},
									{
										name: 'MXN',
										value: 'MXN',
									},
									{
										name: 'NOK',
										value: 'NOK',
									},
									{
										name: 'NZD',
										value: 'NZD',
									},
									{
										name: 'PLN',
										value: 'PLN',
									},
									{
										name: 'RUB',
										value: 'RUB',
									},
									{
										name: 'SEK',
										value: 'SEK',
									},
									{
										name: 'SGD',
										value: 'SGD',
									},
									{
										name: 'THB',
										value: 'THB',
									},
									{
										name: 'TWD',
										value: 'TWD',
									},
									{
										name: 'USD',
										value: 'USD',
									},
									{
										name: 'ZAR',
										value: 'ZAR',
									},
								],
							},
							{
								displayName: 'Discount Amount Currency',
								name: 'discountAmount',
								type: 'number',
								default: '',
								description: 'Discount amount',
								displayOptions: {
									show: {
										discountType: ['flat'],
									},
								},
								typeOptions: {
									minValue: 0,
								},
							},
							{
								displayName: 'Discount Amount Percentage',
								name: 'discountAmount',
								type: 'number',
								default: '',
								description: 'Discount amount',
								displayOptions: {
									show: {
										discountType: ['percentage'],
									},
								},
								typeOptions: {
									minValue: 0,
									maxValue: 100,
								},
							},
							{
								displayName: 'Discount Type',
								name: 'discountType',
								type: 'options',
								default: 'flat',
								description: 'Either flat or percentage',
								options: [
									{
										name: 'Flat',
										value: 'flat',
									},
									{
										name: 'Percentage',
										value: 'percentage',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Expires',
				name: 'expires',
				type: 'dateTime',
				default: '',
				description: 'The coupon will expire on the date at 00:00:00 UTC',
			},
			{
				displayName: 'New Coupon Code',
				name: 'newCouponCode',
				type: 'string',
				default: '',
				description: 'New code to rename the coupon to',
			},
			{
				displayName: 'New Group Name',
				name: 'newGroup',
				type: 'string',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				default: '',
				description: 'New group name to move coupon to',
			},
			{
				displayName: 'Product IDs',
				name: 'productIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of products e.g. 499531,1234,123546. If blank then remove associated products.',
			},
			{
				displayName: 'Recurring',
				name: 'recurring',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'If the coupon is used on subscription products, this indicates whether the discount should apply to recurring payments after the initial purchase',
			},
		],
	},
];
