import type { INodeProperties } from 'n8n-workflow';

import {
	billingAddress,
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
	productDetailsOptions,
	shippingAddress,
} from './SharedFields';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['invoice'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invoice',
				action: 'Create an invoice',
			},
			{
				name: 'Create or update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update an invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice',
				action: 'Delete an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice',
				action: 'Get an invoice',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many invoices',
				action: 'Get many invoices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an invoice',
				action: 'Update an invoice',
			},
		],
		default: 'create',
	},
];

export const invoiceFields: INodeProperties[] = [
	// ----------------------------------------
	//            invoice: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the invoice',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------------
	//            invoice: upsert
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description:
			'Subject or title of the invoice. If a record with this subject exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['upsert'],
			},
		},
	},

	// ----------------------------------------
	//        invoice: create + upsert
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
		placeholder: 'Add field',
		options: productDetailsOptions,
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create', 'upsert'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create', 'upsert'],
			},
		},
		options: [
			{
				displayName: 'Account name or ID',
				name: 'accountId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description:
					'ID of the account associated with this invoice. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: '',
				description: 'Adjustment in the grand total, if any',
			},
			billingAddress,
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('invoice'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due date',
				name: 'Due_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Exchange rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: '',
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Grand total',
				name: 'Grand_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product after deducting tax and discounts',
			},
			{
				displayName: 'Invoice date',
				name: 'Invoice_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Invoice number',
				name: 'Invoice_Number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sales commission',
				name: 'Sales_Commission',
				type: 'number',
				default: '',
				description:
					'Commission of sales person on deal closure as a percentage. For example, enter 12 for 12%.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sub total',
				name: 'Sub_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product excluding tax',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: '',
				description: 'Tax amount as the sum of sales tax and value-added tax',
			},
			{
				displayName: 'Terms and conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the invoice',
			},
		],
	},

	// ----------------------------------------
	//             invoice: delete
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of the invoice to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               invoice: get
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of the invoice to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             invoice: getAll
	// ----------------------------------------
	...makeGetAllFields('invoice'),

	// ----------------------------------------
	//             invoice: update
	// ----------------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		description: 'ID of the invoice to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Account name or ID',
				name: 'accountId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				description:
					'ID of the account associated with this invoice. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: '',
				description: 'Adjustment in the grand total, if any',
			},
			billingAddress,
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('invoice'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due date',
				name: 'Due_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Exchange rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: '',
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Grand total',
				name: 'Grand_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product after deducting tax and discounts',
			},
			{
				displayName: 'Invoice date',
				name: 'Invoice_Date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Invoice number',
				name: 'Invoice_Number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Products',
				name: 'Product_Details',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Product',
				},
				default: {},
				placeholder: 'Add field',
				options: productDetailsOptions,
			},
			{
				displayName: 'Sales commission',
				name: 'Sales_Commission',
				type: 'number',
				default: '',
				description:
					'Commission of sales person on deal closure as a percentage. For example, enter 12 for 12%.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sub total',
				name: 'Sub_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product excluding tax',
			},
			{
				displayName: 'Subject',
				name: 'Subject',
				type: 'string',
				default: '',
				description: 'Subject or title of the invoice',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: '',
				description: 'Tax amount as the sum of sales tax and value-added tax',
			},
			{
				displayName: 'Terms and conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the invoice',
			},
		],
	},
];
