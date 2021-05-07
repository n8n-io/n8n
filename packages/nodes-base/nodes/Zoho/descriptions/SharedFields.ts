export const billingAddress = {
	displayName: 'Billing Address',
	name: 'Billing_Address',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Billing Address Field',
	options: [
		{
			displayName: 'Billing Address Fields',
			name: 'address_fields',
			values: [
				{
					displayName: 'Billing City',
					name: 'Billing_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Billing Code',
					name: 'Billing_Code',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Billing Country',
					name: 'Billing_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Billing State',
					name: 'Billing_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Billing Street',
					name: 'Billing_Street',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const shippingAddress = {
	displayName: 'Shipping Address',
	name: 'Shipping_Address',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Shipping Address Field',
	options: [
		{
			displayName: 'Shipping Address Fields',
			name: 'address_fields',
			values: [
				{
					displayName: 'Shipping City',
					name: 'Shipping_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Shipping Code',
					name: 'Shipping_Code',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Shipping Country',
					name: 'Shipping_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Shipping State',
					name: 'Shipping_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Shipping Street',
					name: 'Shipping_Street',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const mailingAddress = {
	displayName: 'Mailing Address',
	name: 'Mailing_Address',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Mailing Address Field',
	options: [
		{
			displayName: 'Mailing Address Fields',
			name: 'address_fields',
			values: [
				{
					displayName: 'Mailing City',
					name: 'Mailing_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Mailing Country',
					name: 'Mailing_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Mailing State',
					name: 'Mailing_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Mailing Street',
					name: 'Mailing_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Mailing Zip',
					name: 'Mailing_Zip',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const otherAddress = {
	displayName: 'Other Address',
	name: 'Other_Address',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Other Address Field',
	options: [
		{
			displayName: 'Other Address Fields',
			name: 'address_fields',
			values: [
				{
					displayName: 'Other City',
					name: 'Other_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Other State',
					name: 'Other_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Other Street',
					name: 'Other_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Other Zip',
					name: 'Other_Zip',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const address = {
	displayName: 'Address',
	name: 'Address',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Address Field',
	options: [
		{
			displayName: 'Address Fields',
			name: 'address_fields',
			values: [
				{
					displayName: 'City',
					name: 'City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Country',
					name: 'Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Street',
					name: 'Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Zip Code',
					name: 'Zip_Code',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const productDetails = {
	displayName: 'Product Details',
	name: 'Product_Details',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Product Details Field',
	options: [
		{
			displayName: 'Product Details Fields',
			name: 'product_details_fields',
			values: [
				{
					displayName: 'Tax',
					name: 'Tax',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Book',
					name: 'book',
					type: 'string',
					default: '',
				},
				{
					displayName: 'List Price',
					name: 'list_price',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Net Total',
					name: 'net_total',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Product',
					name: 'product',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Product Description',
					name: 'product_description',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Quantity',
					name: 'quantity',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Quantity in Stock',
					name: 'quantity_in_stock',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Total',
					name: 'total',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Total After Discount',
					name: 'total_after_discount',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Unit Price',
					name: 'unit_price',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const makeGetAllFields = (resource: string) => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					resource,
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
					resource,
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
];
