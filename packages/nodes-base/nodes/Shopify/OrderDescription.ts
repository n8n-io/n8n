import { INodeProperties } from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['order'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an order',
				action: 'Create an order',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an order',
				action: 'Delete an order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an order',
				action: 'Get an order',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many orders',
				action: 'Get many orders',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an order',
				action: 'Update an order',
			},
		],
		default: 'create',
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
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['order'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billing Address',
				name: 'billingAddressUi',
				placeholder: 'Add Billing Address',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'billingAddressValues',
						displayName: 'Billing Address',
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
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 1',
								name: 'address1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Province',
								name: 'province',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
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
				displayName: 'Discount Codes',
				name: 'discountCodesUi',
				placeholder: 'Add Discount Code',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'discountCodesValues',
						displayName: 'Discount Code',
						values: [
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'string',
								default: '',
								description: "The amount that's deducted from the order total",
							},
							{
								displayName: 'Code',
								name: 'code',
								type: 'string',
								default: '',
								description: 'When the associated discount application is of type code',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Fixed Amount',
										value: 'fixedAmount',
										description: "Applies amount as a unit of the store's currency",
									},
									{
										name: 'Percentage',
										value: 'percentage',
										description: 'Applies a discount of amount as a percentage of the order total',
									},
									{
										name: 'Shipping',
										value: 'shipping',
										description:
											'Applies a free shipping discount on orders that have a shipping rate less than or equal to amount',
									},
								],
								default: 'fixedAmount',
								description: 'When the associated discount application is of type code',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: "The customer's email address",
			},
			{
				displayName: 'Fulfillment Status',
				name: 'fulfillmentStatus',
				type: 'options',
				options: [
					{
						name: 'Fulfilled',
						value: 'fulfilled',
						description: 'Every line item in the order has been fulfilled',
					},
					{
						name: 'Null',
						value: 'null',
						description: 'None of the line items in the order have been fulfilled',
					},
					{
						name: 'Partial',
						value: 'partial',
						description: 'At least one line item in the order has been fulfilled',
					},
					{
						name: 'Restocked',
						value: 'restocked',
						description: 'Every line item in the order has been restocked and the order canceled',
					},
				],
				default: '',
				description: "The order's status in terms of fulfilled line items",
			},
			{
				displayName: 'Inventory Behaviour',
				name: 'inventoryBehaviour',
				type: 'options',
				options: [
					{
						name: 'Bypass',
						value: 'bypass',
						description: 'Do not claim inventory',
					},
					{
						name: 'Decrement Ignoring Policy',
						value: 'decrementIgnoringPolicy',
						description: "Ignore the product's inventory policy and claim inventory",
					},
					{
						name: 'Decrement Obeying Policy',
						value: 'decrementObeyingPolicy',
						description: "Follow the product's inventory policy and claim inventory, if possible",
					},
				],
				default: 'bypass',
				description: 'The behaviour to use when updating inventory',
			},
			{
				displayName: 'Location Name or ID',
				name: 'locationId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
				default: '',
				description:
					'The ID of the physical location where the order was processed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'An optional note that a shop owner can attach to the order',
			},
			{
				displayName: 'Send Fulfillment Receipt',
				name: 'sendFulfillmentReceipt',
				type: 'boolean',
				default: false,
				description: 'Whether to send a shipping confirmation to the customer',
			},
			{
				displayName: 'Send Receipt',
				name: 'sendReceipt',
				type: 'boolean',
				default: false,
				description: 'Whether to send an order confirmation to the customer',
			},
			{
				displayName: 'Shipping Address',
				name: 'shippingAddressUi',
				placeholder: 'Add Shipping',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'shippingAddressValues',
						displayName: 'Shipping Address',
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
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 1',
								name: 'address1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Province',
								name: 'province',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
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
				displayName: 'Source Name',
				name: 'sourceName',
				type: 'string',
				default: '',
				description:
					'Where the order originated. Can be set only during order creation, and is not writeable afterwards.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Tags attached to the order, formatted as a string of comma-separated values',
			},
			{
				displayName: 'Test',
				name: 'test',
				type: 'boolean',
				default: false,
				description: 'Whether this is a test order',
			},
		],
	},
	{
		displayName: 'Line Items',
		name: 'limeItemsUi',
		placeholder: 'Add Line Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Line Item',
				name: 'lineItemValues',
				values: [
					{
						displayName: 'Product Name or ID',
						name: 'productId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getProducts',
						},
						default: '',
						description:
							'The ID of the product that the line item belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Variant ID',
						name: 'variantId',
						type: 'string',
						default: '',
						description: 'The ID of the product variant',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the product',
					},
					{
						displayName: 'Grams',
						name: 'grams',
						type: 'string',
						default: '',
						description: 'The weight of the item in grams',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'The number of items that were purchased',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                order:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['delete'],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                order:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['get'],
			},
		},
		required: true,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['order'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description:
					'Fields the order will return, formatted as a string of comma-separated values. By default all the fields are returned.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                order:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['getAll'],
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
				resource: ['order'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['order'],
			},
		},
		options: [
			{
				displayName: 'Attribution App ID',
				name: 'attributionAppId',
				type: 'string',
				default: '',
				description:
					'Show orders attributed to a certain app, specified by the app ID. Set as current to show orders for the app currently consuming the API.',
			},
			{
				displayName: 'Created At Min',
				name: 'createdAtMin',
				type: 'dateTime',
				default: '',
				description: 'Show orders created at or after date',
			},
			{
				displayName: 'Created At Max',
				name: 'createdAtMax',
				type: 'dateTime',
				default: '',
				description: 'Show orders created at or before date',
			},
			{
				displayName: 'Financial Status',
				name: 'financialStatus',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'Show orders of any financial status',
					},
					{
						name: 'Authorized',
						value: 'authorized',
						description: 'Show only authorized orders',
					},
					{
						name: 'Paid',
						value: 'paid',
						description: 'Show only paid orders',
					},
					{
						name: 'Partially Paid',
						value: 'partiallyPaid',
						description: 'Show only partially paid orders',
					},
					{
						name: 'Partially Refunded',
						value: 'partiallyRefunded',
						description: 'Show only partially refunded orders',
					},
					{
						name: 'Pending',
						value: 'pending',
						description: 'Show only pending orders',
					},
					{
						name: 'Refunded',
						value: 'refunded',
						description: 'Show only refunded orders',
					},
					{
						name: 'Unpaid',
						value: 'unpaid',
						description: 'Show authorized and partially paid orders',
					},
					{
						name: 'Voided',
						value: 'voided',
						description: 'Show only voided orders',
					},
				],
				default: 'any',
				description: 'Filter orders by their financial status',
			},
			{
				displayName: 'Fulfillment Status',
				name: 'fulfillmentStatus',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'Show orders of any fulfillment status',
					},
					{
						name: 'Partial',
						value: 'partial',
						description: 'Show partially shipped orders',
					},
					{
						name: 'Shipped',
						value: 'shipped',
						description:
							'Show orders that have been shipped. Returns orders with fulfillment_status of fulfilled.',
					},
					{
						name: 'Unfulfilled',
						value: 'unfulfilled',
						description: 'Returns orders with fulfillment_status of null or partial',
					},
					{
						name: 'Unshipped',
						value: 'unshipped',
						description:
							'Show orders that have not yet been shipped. Returns orders with fulfillment_status of null.',
					},
				],
				default: 'any',
				description: 'Filter orders by their fulfillment status',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description:
					'Fields the orders will return, formatted as a string of comma-separated values. By default all the fields are returned.',
			},
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Retrieve only orders specified by a comma-separated list of order IDs',
			},
			{
				displayName: 'Processed At Max',
				name: 'processedAtMax',
				type: 'dateTime',
				default: '',
				description: 'Show orders imported at or before date',
			},
			{
				displayName: 'Processed At Min',
				name: 'processedAtMin',
				type: 'dateTime',
				default: '',
				description: 'Show orders imported at or after date',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'Show orders of any status, including archived orders',
					},
					{
						name: 'Cancelled',
						value: 'Cancelled',
						description: 'Show only canceled orders',
					},
					{
						name: 'Closed',
						value: 'closed',
						description: 'Show only closed orders',
					},
					{
						name: 'Open',
						value: 'open',
						description: 'Show only open orders',
					},
				],
				default: 'open',
				description: 'Filter orders by their status',
			},
			{
				displayName: 'Since ID',
				name: 'sinceId',
				type: 'string',
				default: '',
				description: 'Show orders after the specified ID',
			},
			{
				displayName: 'Updated At Max',
				name: 'updatedAtMax',
				type: 'dateTime',
				default: '',
				description: 'Show orders last updated at or after date',
			},
			{
				displayName: 'Updated At Min',
				name: 'updatedAtMin',
				type: 'dateTime',
				default: '',
				description: 'Show orders last updated at or before date',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                order:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['order'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: "The customer's email address",
			},
			{
				displayName: 'Location Name or ID',
				name: 'locationId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
				default: '',
				description:
					'The ID of the physical location where the order was processed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'An optional note that a shop owner can attach to the order',
			},
			{
				displayName: 'Shipping Address',
				name: 'shippingAddressUi',
				placeholder: 'Add Shipping',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'shippingAddressValues',
						displayName: 'Shipping Address',
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
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 1',
								name: 'address1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Province',
								name: 'province',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
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
				displayName: 'Source Name',
				name: 'sourceName',
				type: 'string',
				default: '',
				description:
					'Where the order originated. Can be set only during order creation, and is not writeable afterwards.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Tags attached to the order, formatted as a string of comma-separated values',
			},
		],
	},
];
