import type { INodeProperties } from 'n8n-workflow';

import { capitalizeInitial } from '../GenericFunctions';
import type { CamelCaseResource } from '../types';

export const billingAddress: INodeProperties = {
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
					displayName: 'Street',
					name: 'Billing_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'Billing_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'Billing_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Country',
					name: 'Billing_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Zip Code',
					name: 'Billing_Code',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const shippingAddress: INodeProperties = {
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
					displayName: 'Street',
					name: 'Shipping_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'Shipping_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'Shipping_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Country',
					name: 'Shipping_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Zip Code',
					name: 'Shipping_Code',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const mailingAddress: INodeProperties = {
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
					displayName: 'Street',
					name: 'Mailing_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'Mailing_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'Mailing_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Country',
					name: 'Mailing_Country',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Zip Code',
					name: 'Mailing_Zip',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const otherAddress: INodeProperties = {
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
					displayName: 'Street',
					name: 'Other_Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'Other_City',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'Other_State',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Zip Code',
					name: 'Other_Zip',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

export const address: INodeProperties = {
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
					displayName: 'Street',
					name: 'Street',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'City',
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
					displayName: 'Country',
					name: 'Country',
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

// displayName: 'Products',
// name: 'Product_Details',
// type: 'collection',
// typeOptions: {
// 	multipleValues: true,
// 	multipleValueButtonText: 'Add Product',
// },
// default: {},
// placeholder: 'Add Field',
// displayOptions: {
// 	show: {
// 		resource: [
// 			resource,
// 		],
// 		operation: [
// 			operation,
// 		],
// 	},
// },

export const productDetailsOptions: INodeProperties[] = [
	{
		displayName: 'List Price',
		name: 'list_price',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Product Name or ID',
		name: 'id',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProducts',
		},
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
		type: 'number',
		default: 1,
	},
	{
		displayName: 'Quantity in Stock',
		name: 'quantity_in_stock',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Tax',
		name: 'Tax',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Total',
		name: 'total',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Total After Discount',
		name: 'total_after_discount',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Total (Net)',
		name: 'net_total',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Unit Price',
		name: 'unit_price',
		type: 'number',
		default: 0,
	},
];

export const makeGetAllFields = (resource: CamelCaseResource): INodeProperties[] => {
	const loadOptionsMethod = `get${capitalizeInitial(resource)}Fields`;

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 5,
			description: 'Max number of results to return',
			typeOptions: {
				minValue: 1,
				maxValue: 1000,
			},
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
					returnAll: [false],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
				},
			},
			options: [
				{
					displayName: 'Approved',
					name: 'approved',
					type: 'boolean',
					default: true,
					description: 'Whether to retrieve only approved records. Defaults to true.',
				},
				{
					displayName: 'Converted',
					name: 'converted',
					type: 'boolean',
					default: false,
					description: 'Whether to retrieve only converted records. Defaults to false.',
				},
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'multiOptions',
					typeOptions: {
						loadOptionsMethod,
					},
					default: [],
					description: 'Return only these fields',
				},
				{
					displayName: 'Include Child',
					name: 'include_child',
					type: 'boolean',
					default: false,
					description: 'Whether to retrieve only records from child territories',
				},
				{
					displayName: 'Sort By',
					name: 'sort_by',
					type: 'options',
					typeOptions: {
						loadOptionsMethod,
					},
					default: [],
					description: 'Field to sort records by',
				},
				{
					displayName: 'Sort Order',
					name: 'sort_order',
					type: 'options',
					options: [
						{
							name: 'Ascending',
							value: 'asc',
						},
						{
							name: 'Descending',
							value: 'desc',
						},
					],
					default: 'desc',
					description: 'Ascending or descending order sort order',
				},
				{
					displayName: 'Territory ID',
					name: 'territory_id',
					type: 'string',
					default: '',
					description: 'Retrieve only records from this territory',
				},
			],
		},
	];
};

export const makeCustomFieldsFixedCollection = (resource: CamelCaseResource): INodeProperties => {
	const loadOptionsMethod = `getCustom${capitalizeInitial(resource)}Fields`;

	return {
		displayName: 'Custom Fields',
		name: 'customFields',
		placeholder: 'Add Custom Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		description: 'Filter by custom fields',
		default: {},
		options: [
			{
				name: 'customFields',
				displayName: 'Custom Field',
				values: [
					{
						displayName: 'Field ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod,
						},
						default: '',
						description: 'Custom field to set a value to',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set on custom field',
					},
				],
			},
		],
	};
};

// https://www.zoho.com/subscriptions/help/supported-currencies.html

export const currencies = [
	{ name: 'US Dollar', value: 'USD' },
	{ name: 'Euro', value: 'EUR' },
	{ name: 'UAE Dirham', value: 'AED' },
	{ name: 'Afghani', value: 'AFN' },
	{ name: 'Lek', value: 'ALL' },
	{ name: 'Argentine Peso', value: 'ARS' },
	{ name: 'Australian Dollar', value: 'AUD' },
	{ name: 'Azerbaijan Manat', value: 'AZN' },
	{ name: 'Barbados Dollar', value: 'BBD' },
	{ name: 'Taka', value: 'BDT' },
	{ name: 'Bulgarian Lev', value: 'BGN' },
	{ name: 'Bermudian Dollar', value: 'BMD' },
	{ name: 'Brunei Dollar', value: 'BND' },
	{ name: 'Boliviano', value: 'BOB' },
	{ name: 'Brazilian Real', value: 'BRL' },
	{ name: 'Bahamian Dollar', value: 'BSD' },
	{ name: 'Pula', value: 'BWP' },
	{ name: 'Belize Dollar', value: 'BZD' },
	{ name: 'Canadian Dollar', value: 'CAD' },
	{ name: 'Swiss Franc', value: 'CHF' },
	{ name: 'Chilean Peso', value: 'CLP' },
	{ name: 'Yuan Renminbi', value: 'CNY' },
	{ name: 'Colombian Peso', value: 'COP' },
	{ name: 'Costa Rican Colon', value: 'CRC' },
	{ name: 'Czech Koruna', value: 'CZK' },
	{ name: 'Danish Krone', value: 'DKK' },
	{ name: 'Dominican Peso', value: 'DOP' },
	{ name: 'Algerian Dinar', value: 'DZD' },
	{ name: 'Egyptian Pound', value: 'EGP' },
	{ name: 'Fiji Dollar', value: 'FJD' },
	{ name: 'Pound Sterling', value: 'GBP' },
	{ name: 'Quetzal', value: 'GTQ' },
	{ name: 'Hong Kong Dollar', value: 'HKD' },
	{ name: 'Lempira', value: 'HNL' },
	{ name: 'Kuna', value: 'HRK' },
	{ name: 'Forint', value: 'HUF' },
	{ name: 'Rupiah', value: 'IDR' },
	{ name: 'New Israeli Sheqel', value: 'ILS' },
	{ name: 'Indian Rupee', value: 'INR' },
	{ name: 'Jamaican Dollar', value: 'JMD' },
	{ name: 'Yen', value: 'JPY' },
	{ name: 'Kenyan Shilling', value: 'KES' },
	{ name: 'Won', value: 'KRW' },
	{ name: 'Tenge', value: 'KZT' },
	{ name: 'Lao Kip', value: 'LAK' },
	{ name: 'Lebanese Pound', value: 'LBP' },
	{ name: 'Sri Lanka Rupee', value: 'LKR' },
	{ name: 'Liberian Dollar', value: 'LRD' },
	{ name: 'Moroccan Dirham', value: 'MAD' },
	{ name: 'Kyat', value: 'MMK' },
	{ name: 'Pataca', value: 'MOP' },
	{ name: 'Ouguiya', value: 'MRO' },
	{ name: 'Mauritius Rupee', value: 'MUR' },
	{ name: 'Rufiyaa', value: 'MVR' },
	{ name: 'Mexican Peso', value: 'MXN' },
	{ name: 'Malaysian Ringgit', value: 'MYR' },
	{ name: 'Cordoba Oro', value: 'NIO' },
	{ name: 'Norwegian Krone', value: 'NOK' },
	{ name: 'Nepalese Rupee', value: 'NPR' },
	{ name: 'New Zealand Dollar', value: 'NZD' },
	{ name: 'Sol', value: 'PEN' },
	{ name: 'Kina', value: 'PGK' },
	{ name: 'Philippine Peso', value: 'PHP' },
	{ name: 'Pakistan Rupee', value: 'PKR' },
	{ name: 'Zloty', value: 'PLN' },
	{ name: 'Qatari Rial', value: 'QAR' },
	{ name: 'Romanian Leu', value: 'RON' },
	{ name: 'Russian Ruble', value: 'RUB' },
	{ name: 'Saudi Riyal', value: 'SAR' },
	{ name: 'Solomon Islands Dollar', value: 'SBD' },
	{ name: 'Seychelles Rupee', value: 'SCR' },
	{ name: 'Swedish Krona', value: 'SEK' },
	{ name: 'Singapore Dollar', value: 'SGD' },
	{ name: 'Syrian Pound', value: 'SYP' },
	{ name: 'Baht', value: 'THB' },
	{ name: 'Pa’anga', value: 'TOP' },
	{ name: 'Turkish Lira', value: 'TRY' },
	{ name: 'Trinidad and Tobago Dollar', value: 'TTD' },
	{ name: 'New Taiwan Dollar', value: 'TWD' },
	{ name: 'Hryvnia', value: 'UAH' },
	{ name: 'Dong', value: 'VND' },
	{ name: 'Vatu', value: 'VUV' },
	{ name: 'Tala', value: 'WST' },
	{ name: 'East Caribbean Dollar', value: 'XCD' },
	{ name: 'West African CFA Franc', value: 'XOF' },
	{ name: 'Yemeni Rial', value: 'YER' },
	{ name: 'Rand', value: 'ZAR' },
];
