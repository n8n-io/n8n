import type { INodeProperties } from 'n8n-workflow';

export const ecommerceOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ecommerceOrder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an ecommerce order',
				action: 'Create an e-commerce order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an ecommerce order',
				action: 'Get an e-commerce order',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an ecommerce order',
				action: 'Delete an e-commerce order',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many ecommerce orders',
				action: 'Get many e-commerce orders',
			},
		],
		default: 'create',
	},
];

export const ecommerceOrderFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 ecommerceOrder:create                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	{
		displayName: 'Order date',
		name: 'orderDate',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	{
		displayName: 'Order title',
		name: 'orderTitle',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	{
		displayName: 'Order type',
		name: 'orderType',
		type: 'options',
		options: [
			{
				name: 'Offline',
				value: 'offline',
			},
			{
				name: 'Online',
				value: 'online',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		options: [
			{
				displayName: 'Lead affiliate ID',
				name: 'leadAffiliateId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Promo codes',
				name: 'promoCodes',
				type: 'string',
				default: '',
				description:
					'Uses multiple strings separated by comma as promo codes. The corresponding discount will be applied to the order.',
			},
			{
				displayName: 'Sales affiliate ID',
				name: 'salesAffiliateId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},
	{
		displayName: 'Shipping address',
		name: 'addressUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		default: {},
		placeholder: 'Add address',
		displayOptions: {
			show: {
				resource: ['ecommerceOrder'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'addressValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country code name or ID',
						name: 'countryCode',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getCountries',
						},
						default: '',
					},
					{
						displayName: 'First name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Middle name',
						name: 'middleName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Line 1',
						name: 'line1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Line 2',
						name: 'line2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Locality',
						name: 'locality',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Region',
						name: 'region',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip code',
						name: 'zipCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip four',
						name: 'zipFour',
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
		displayName: 'Order items',
		name: 'orderItemsUi',
		type: 'fixedCollection',
		placeholder: 'Add order item',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['ecommerceOrder'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'orderItemsValues',
				displayName: 'Order item',
				values: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Overridable price of the product, if not specified, the default will be used',
					},
					{
						displayName: 'Product ID',
						name: 'product ID',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ecommerceOrder:delete                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ecommerceOrder:get                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['ecommerceOrder'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ecommerceOrder:getAll                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['ecommerceOrder'],
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
				resource: ['ecommerceOrder'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['ecommerceOrder'],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Date to start searching from',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'Date to search to',
			},
			{
				displayName: 'Paid',
				name: 'paid',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'string',
				default: '',
				description: 'Attribute to order items by',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},
];
