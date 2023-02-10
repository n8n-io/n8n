import type { INodeProperties } from 'n8n-workflow';

import {
	billingAddress,
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
	productDetailsOptions,
	shippingAddress,
} from './SharedFields';

export const quoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quote'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a quote',
				action: 'Create a quote',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a quote',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a quote',
				action: 'Delete a quote',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a quote',
				action: 'Get a quote',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many quotes',
				action: 'Get many quotes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a quote',
				action: 'Update a quote',
			},
		],
		default: 'create',
	},
];

export const quoteFields: INodeProperties[] = [
	// ----------------------------------------
	//            quote: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the quote',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------------
	//            quote: upsert
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description:
			'Subject or title of the quote. If a record with this subject exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['upsert'],
			},
		},
	},

	// ----------------------------------------
	//          quote: create + upsert
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
				resource: ['quote'],
				operation: ['create', 'upsert'],
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
				resource: ['quote'],
				operation: ['create', 'upsert'],
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
				description: 'Adjustment in the grand total, if any',
			},
			billingAddress,
			{
				displayName: 'Carrier',
				name: 'Carrier',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('quote'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
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
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product after deducting tax and discounts',
			},
			{
				displayName: 'Quote Stage Name or ID',
				name: 'Quote_Stage',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getQuoteStage',
				},
				description:
					'Stage of the quote. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			shippingAddress,
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product excluding tax',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount as the sum of sales tax and value-added tax',
			},
			{
				displayName: 'Team',
				name: 'Team',
				type: 'string',
				default: '',
				description: 'Team for whom the quote is created',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the quote',
			},
			{
				displayName: 'Valid Till',
				name: 'Valid_Till',
				type: 'dateTime',
				default: '',
				description: 'Date until when the quote is valid',
			},
		],
	},

	// ----------------------------------------
	//              quote: delete
	// ----------------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		description: 'ID of the quote to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                quote: get
	// ----------------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		description: 'ID of the quote to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//              quote: getAll
	// ----------------------------------------
	...makeGetAllFields('quote'),

	// ----------------------------------------
	//              quote: update
	// ----------------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		description: 'ID of the quote to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['update'],
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
				resource: ['quote'],
				operation: ['update'],
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
				description: 'Adjustment in the grand total, if any',
			},
			billingAddress,
			{
				displayName: 'Carrier',
				name: 'Carrier',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('quote'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
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
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product after deducting tax and discounts',
			},
			{
				displayName: 'Quote Stage Name or ID',
				name: 'Quote_Stage',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getQuoteStage',
				},
				description:
					'Stage of the quote. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			shippingAddress,
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Total amount for the product excluding tax',
			},
			{
				displayName: 'Subject',
				name: 'Subject',
				type: 'string',
				default: '',
				description: 'Subject or title of the quote',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Tax amount as the sum of sales tax and value-added tax',
			},
			{
				displayName: 'Team',
				name: 'Team',
				type: 'string',
				default: '',
				description: 'Team for whom the quote is created',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the quote',
			},
			{
				displayName: 'Valid Till',
				name: 'Valid_Till',
				type: 'dateTime',
				default: '',
				description: 'Date until when the quote is valid',
			},
		],
	},
];
