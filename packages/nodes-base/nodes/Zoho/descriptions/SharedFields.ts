import { capitalizeInitial } from '../GenericFunctions';
import { CamelCaseResource } from '../types';

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

export const makeProductDetails = (resource: CamelCaseResource) => ({
	displayName: 'Products',
	name: 'Product_Details',
	type: 'collection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Product',
	},
	default: {},
	placeholder: 'Add Field',
	displayOptions: {
		show: {
			resource: [
				resource,
			],
			operation: [
				'create',
				'upsert',
			],
		},
	},
	options: [
		{
			displayName: 'List Price',
			name: 'list_price',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Net Total',
			name: 'net_total',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Product ID',
			name: 'id',
			type: 'options',
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
			default: '',
		},
		{
			displayName: 'Quantity in Stock',
			name: 'quantity_in_stock',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Tax',
			name: 'Tax',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Total',
			name: 'total',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Total After Discount',
			name: 'total_after_discount',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Unit Price',
			name: 'unit_price',
			type: 'number',
			default: '',
		},
	],
});

export const makeGetAllFields = (resource: CamelCaseResource) => {
	const loadOptionsMethod = `get${capitalizeInitial(resource)}Fields`;

	return [
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
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: {
				show: {
					resource: [
						resource,,
					],
					operation: [
						'getAll',
					],
				},
			},
			options: [
				{
					displayName: 'Approved',
					name: 'approved',
					type: 'boolean',
					default: true,
					description: 'Retrieve only approved leads. Defaults to true.',
				},
				{
					displayName: 'Converted',
					name: 'converted',
					type: 'boolean',
					default: false,
					description: 'Retrieve only converted leads. Defaults to false.',
				},
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'multiOptions',
					typeOptions: {
						loadOptionsMethod,
					},
					default: [],
					description: 'Return only these fields.',
				},
				{
					displayName: 'Include Child',
					name: 'include_child',
					type: 'boolean',
					default: false,
					description: 'Retrieve only leads from child territories.',
				},
				{
					displayName: 'Sort By',
					name: 'sort_by',
					type: 'options',
					typeOptions: {
						loadOptionsMethod,
					},
					default: [],
					description: 'Field to sort leads by.',
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
					description: 'Ascending or descending order sort order.',
				},
				{
					displayName: 'Territory ID',
					name: 'territory_id',
					type: 'string',
					default: '',
					description: 'Retrieve only leads from this territory.',
				},
			],
		},
	];
};

export const makeCustomFieldsFixedCollection = (resource: CamelCaseResource) => {
	const loadOptionsMethod = `getCustom${capitalizeInitial(resource)}Fields`;

	return {
		displayName: 'Custom Fields',
		name: 'customFields',
		placeholder: 'Add Custom Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		description: 'Filter by custom fields.',
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
						description: 'Custom field to set a value to.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set on custom field.',
					},
				],
			},
		],
	};
};
