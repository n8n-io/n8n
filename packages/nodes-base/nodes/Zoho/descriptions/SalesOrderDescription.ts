import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billingAddress,
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
	productDetailsOptions,
	shippingAddress,
} from './SharedFields';

export const salesOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a sales order',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a sales order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a sales order',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all sales orders',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a sales order',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const salesOrderFields: INodeProperties[] = [
	// ----------------------------------------
	//       salesOrder: create + upsert
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		required: true,
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getAccounts',
		},
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
	},

	// ----------------------------------------
	//           salesOrder: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the sales order.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//           salesOrder: upsert
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the sales order. If a record with this subject exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'upsert',
				],
			},
		},
	},

	// ----------------------------------------
	//       salesOrder: create + upsert
	// ----------------------------------------
	{
		displayName: 'Products',
		name: 'Product_Details',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Product',
		},
		default: {},
		placeholder: 'Add Field',
		options: productDetailsOptions,
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Adjustment in the grand total, if any.',
			},
			billingAddress,
			{
				displayName: 'Carrier',
				name: 'Carrier',
				type: 'string',
				default: '',
				description: 'Name of the carrier.',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated.',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('salesOrder'),
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getDeals',
				},
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Discount',
				name: 'Discount',
				type: 'number',
				description: 'Discount applied to the sales order. For example, enter 12 for 12%.',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Due Date',
				name: 'Due_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Exchange rate of the default currency to the home currency.',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product after deducting tax and discounts.',
			},
			{
				displayName: 'Sales Order Number',
				name: 'SO_Number',
				type: 'string',
				default: '',
				description: 'ID of the sales order after creating a case.',
			},
			{
				displayName: 'Sales Commission',
				name: 'Sales_Commission',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Commission of sales person on deal closure as a percentage. For example, enter 12 for 12%.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getSalesOrderStatus',
				},
				description: 'Status of the sales order.',
			},
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product excluding tax.',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Tax amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the purchase order.',
			},
		],
	},

	// ----------------------------------------
	//            salesOrder: delete
	// ----------------------------------------
	{
		displayName: 'Sales Order ID',
		name: 'salesOrderId',
		description: 'ID of the sales order to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//             salesOrder: get
	// ----------------------------------------
	{
		displayName: 'Sales Order ID',
		name: 'salesOrderId',
		description: 'ID of the sales order to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            salesOrder: getAll
	// ----------------------------------------
	...makeGetAllFields('salesOrder'),

	// ----------------------------------------
	//            salesOrder: update
	// ----------------------------------------
	{
		displayName: 'Sales Order ID',
		name: 'salesOrderId',
		description: 'ID of the sales order to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'salesOrder',
				],
				operation: [
					'update',
				],
			},
		},
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
					'salesOrder',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description: 'ID of the account associated with this invoice.',
			},
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Adjustment in the grand total, if any.',
			},
			billingAddress,
			{
				displayName: 'Carrier',
				name: 'Carrier',
				type: 'string',
				default: '',
				description: 'Name of the carrier.',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated.',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('salesOrder'),
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getDeals',
				},
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Discount',
				name: 'Discount',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Due Date',
				name: 'Due_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Exchange rate of the default currency to the home currency.',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product after deducting tax and discounts.',
			},
			{
				displayName: 'Sales Order Number',
				name: 'SO_Number',
				type: 'string',
				default: '',
				description: 'ID of the sales order after creating a case.',
			},
			{
				displayName: 'Sales Commission',
				name: 'Sales_Commission',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Commission of sales person on deal closure as a percentage. For example, enter 12 for 12%.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getSalesOrderStatus',
				},
				description: 'Status of the sales order.',
			},
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product excluding tax.',
			},
			{
				displayName: 'Subject',
				name: 'Subject',
				type: 'string',
				default: '',
				description: 'Subject or title of the sales order.',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Tax amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the purchase order.',
			},
		],
	},
];
