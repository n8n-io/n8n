import { INodeProperties } from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a order',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a order',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all orders',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a order',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const orderFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                order:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description: 'Currency the order was created with',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				description: 'User ID who owns the order. 0 for guests',
			},
			{
				displayName: 'Customer Note',
				name: 'customerNote',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Note left by customer during checkout.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Parent order ID.',
			},
			{
				displayName: 'Payment Method ID',
				name: 'paymentMethodId',
				type: 'string',
				default: '',
				description: 'Payment method ID.',
			},
			{
				displayName: 'Payment Method Title',
				name: 'paymentMethodTitle',
				type: 'string',
				default: '',
				description: 'Payment method title.',
			},
			{
				displayName: 'Set Paid',
				name: 'setPaid',
				type: 'boolean',
				default: false,
				description: 'Define if the order is paid. It will set the status to processing and reduce stock items',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'cancelled',
						value: 'cancelled',
					},
					{
						name: 'completed',
						value: 'completed',
					},
					{
						name: 'failed',
						value: 'failed',
					},
					{
						name: 'on-hold',
						value: 'on-hold',
					},
					{
						name: 'pending',
						value: 'pending',
					},
					{
						name: 'processing',
						value: 'processing',
					},
					{
						name: 'refunded',
						value: 'refunded',
					},
					{
						name: 'trash',
						value: 'trash',
					},
				],
				default: 'pending',
				description: 'A named status for the order.',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionID',
				type: 'string',
				default: '',
				description: 'Unique transaction ID',
			},
		],
	},
	{
		displayName: 'Billing',
		name: 'billingUi',
		placeholder: 'Add Billing',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Billing address',
		options: [
			{
				name: 'billingValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 1',
						name: 'address_1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 2',
						name: 'address_2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'ISO code or name of the state, province or district.',
					},
					{
						displayName: 'Postal Code',
						name: 'postcode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Coupon Lines',
		name: 'couponLinesUi',
		placeholder: 'Add Coupon Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Coupons line data',
		options: [
			{
				name: 'couponLinesValues',
				displayName: 'Coupon Line',
				values: [
					{
						displayName: 'Code',
						name: 'code',
						type: 'string',
						default: '',
						description: 'Coupon code.',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Fee Lines',
		name: 'feeLinesUi',
		placeholder: 'Add Fee Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Fee line data',
		options: [
			{
				name: 'feeLinesValues',
				displayName: 'Fee Line',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Fee name',
					},
					{
						displayName: 'Tax Class	',
						name: 'taxClass',
						type: 'string',
						description: 'Tax class of fee.',
						default: '',
					},
					{
						displayName: 'Tax Status	',
						name: 'taxStatus',
						type: 'options',
						options: [
							{
								name: 'Taxable',
								value: 'taxable',
							},
							{
								name: 'None',
								value: 'none',
							},
						],
						default: '',
						description: 'Tax class of fee.',
					},
					{
						displayName: 'Total	',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Line Items',
		name: 'lineItemsUi',
		placeholder: 'Add Line Item',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Line item data',
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Line Item',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Product name.',
					},
					{
						displayName: 'Product ID',
						name: 'productId',
						type: 'number',
						default: 0,
						description: 'Product ID.',
					},
					{
						displayName: 'Variation ID',
						name: 'variationId',
						type: 'number',
						default: 0,
						description: 'Variation ID, if applicable.',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						default: 1,
						description: 'Quantity ordered.',
					},
					{
						displayName: 'Tax Class',
						name: 'taxClass',
						type: 'string',
						default: '',
						description: 'Slug of the tax class of product.',
					},
					{
						displayName: 'Subtotal',
						name: 'subtotal',
						type: 'string',
						default: '',
						description: 'Line subtotal (before discounts).',
					},
					{
						displayName: 'Total',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadataUi',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Meta data',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the metadata key to add.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the metadata key.',
					},
				],
			},
		],
	},
	{
		displayName: 'Shipping',
		name: 'shippingUi',
		placeholder: 'Add Shipping',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Shipping address',
		options: [
			{
				name: 'shippingValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 1',
						name: 'address_1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 2',
						name: 'address_2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'ISO code or name of the state, province or district.',
					},
					{
						displayName: 'Postal Code',
						name: 'postcode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Shipping Lines',
		name: 'shippingLinesUi',
		placeholder: 'Add Shipping Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Shipping line data',
		options: [
			{
				name: 'shippingLinesValues',
				displayName: 'Fee Line',
				values: [
					{
						displayName: 'Method Title',
						name: 'methodTitle',
						type: 'string',
						default: '',
						description: 'Shipping method name',
					},
					{
						displayName: 'Method ID	',
						name: 'method ID',
						type: 'string',
						description: 'Shipping method ID.',
						default: '',
					},
					{
						displayName: 'Total	',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 order:update                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'order ID.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description: 'Currency the order was created with',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				description: 'User ID who owns the order. 0 for guests',
			},
			{
				displayName: 'Customer Note',
				name: 'customerNote',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Note left by customer during checkout.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Parent order ID.',
			},
			{
				displayName: 'Payment Method ID',
				name: 'paymentMethodId',
				type: 'string',
				default: '',
				description: 'Payment method ID.',
			},
			{
				displayName: 'Payment Method Title',
				name: 'paymentMethodTitle',
				type: 'string',
				default: '',
				description: 'Payment method title.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'cancelled',
						value: 'cancelled',
					},
					{
						name: 'completed',
						value: 'completed',
					},
					{
						name: 'failed',
						value: 'failed',
					},
					{
						name: 'on-hold',
						value: 'on-hold',
					},
					{
						name: 'pending',
						value: 'pending',
					},
					{
						name: 'processing',
						value: 'processing',
					},
					{
						name: 'refunded',
						value: 'refunded',
					},
					{
						name: 'trash',
						value: 'trash',
					},
				],
				default: 'pending',
				description: 'A named status for the order.',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionID',
				type: 'string',
				default: '',
				description: 'Unique transaction ID',
			},
		],
	},
	{
		displayName: 'Billing',
		name: 'billingUi',
		placeholder: 'Add Billing',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Billing address',
		options: [
			{
				name: 'billingValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 1',
						name: 'address_1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 2',
						name: 'address_2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'ISO code or name of the state, province or district.',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Coupon Lines',
		name: 'couponLinesUi',
		placeholder: 'Add Coupon Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Coupons line data',
		options: [
			{
				name: 'couponLinesValues',
				displayName: 'Coupon Line',
				values: [
					{
						displayName: 'Code',
						name: 'code',
						type: 'string',
						default: '',
						description: 'Coupon code.',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Fee Lines',
		name: 'feeLinesUi',
		placeholder: 'Add Fee Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Fee line data',
		options: [
			{
				name: 'feeLinesValues',
				displayName: 'Fee Line',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Fee name',
					},
					{
						displayName: 'Tax Class	',
						name: 'taxClass',
						type: 'string',
						description: 'Tax class of fee.',
						default: '',
					},
					{
						displayName: 'Tax Status	',
						name: 'taxStatus',
						type: 'options',
						options: [
							{
								name: 'Taxable',
								value: 'taxable',
							},
							{
								name: 'None',
								value: 'none',
							},
						],
						default: '',
						description: 'Tax class of fee.',
					},
					{
						displayName: 'Total	',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Line Items',
		name: 'lineItemsUi',
		placeholder: 'Add Line Item',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Line item data',
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Line Item',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Product name.',
					},
					{
						displayName: 'Product ID',
						name: 'productId',
						type: 'number',
						default: 0,
						description: 'Product ID.',
					},
					{
						displayName: 'Variation ID',
						name: 'variationId',
						type: 'number',
						default: 0,
						description: 'Variation ID, if applicable.',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						default: 1,
						description: 'Quantity ordered.',
					},
					{
						displayName: 'Tax Class',
						name: 'taxClass',
						type: 'string',
						default: '',
						description: 'Slug of the tax class of product.',
					},
					{
						displayName: 'Subtotal',
						name: 'subtotal',
						type: 'string',
						default: '',
						description: 'Line subtotal (before discounts).',
					},
					{
						displayName: 'Total',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadataUi',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Meta data',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the metadata key to add.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the metadata key.',
					},
				],
			},
		],
	},
	{
		displayName: 'Shipping',
		name: 'shippingUi',
		placeholder: 'Add Shipping',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Shipping address',
		options: [
			{
				name: 'shippingValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 1',
						name: 'address_1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address Line 2',
						name: 'address_2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'ISO code or name of the state, province or district.',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Shipping Lines',
		name: 'shippingLinesUi',
		placeholder: 'Add Shipping Line',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Shipping line data',
		options: [
			{
				name: 'shippingLinesValues',
				displayName: 'Fee Line',
				values: [
					{
						displayName: 'Method Title',
						name: 'methodTitle',
						type: 'string',
						default: '',
						description: 'Shipping method name',
					},
					{
						displayName: 'Method ID	',
						name: 'method ID',
						type: 'string',
						description: 'Shipping method ID.',
						default: '',
					},
					{
						displayName: 'Total	',
						name: 'total',
						type: 'string',
						default: '',
						description: 'Line total (after discounts).',
					},
					{
						displayName: 'Metadata',
						name: 'metadataUi',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Meta data',
						options: [
							{
								name: 'metadataValues',
								displayName: 'Metadata',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Name of the metadata key to add.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the metadata key.',
									},
								],
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                   order:get                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'order ID.',
	},
/* -------------------------------------------------------------------------- */
/*                                   order:getAll                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Limit response to resources published after a given ISO8601 compliant date.',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Limit response to resources published before a given ISO8601 compliant date',
			},
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'string',
				default: '',
				description: 'Limit result set to orders assigned a specific customer.',
			},
			{
				displayName: 'Decimal Points',
				name: 'decimalPoints',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 10,
				},
				default: 2,
				description: 'Number of decimal points to use in each resource.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Order sort attribute ascending or descending.',
			},
			{
				displayName: 'Product',
				name: 'product',
				type: 'string',
				default: '',
				description: 'Limit result set to orders assigned a specific product.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Include',
						value: 'include',
					},
					{
						name: 'Slug',
						value: 'slug',
					},
					{
						name: 'Title',
						value: 'title',
					},
				],
				default: 'id',
				description: 'Sort collection by object attribute.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Limit results to those matching a string.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
					},
					{
						name: 'completed',
						value: 'completed',
					},
					{
						name: 'cancelled',
						value: 'cancelled',
					},
					{
						name: 'failed',
						value: 'failed',
					},
					{
						name: 'on-hold',
						value: 'on-hold',
					},
					{
						name: 'pending',
						value: 'pending',
					},
					{
						name: 'processing',
						value: 'processing',
					},
					{
						name: 'refunded',
						value: 'refunded',
					},
					{
						name: 'trash',
						value: 'trash',
					},
				],
				default: 'any',
				description: 'Limit result set to orders assigned a specific status.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                   order:delete                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'order ID.',
	},
];
