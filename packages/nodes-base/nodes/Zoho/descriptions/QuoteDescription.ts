import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billingAddress,
	makeGetAllFields,
	productDetails,
	shippingAddress,
} from './SharedFields';

export const quoteOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const quoteFields = [
	// ----------------------------------------
	//              quote: create
	// ----------------------------------------
	{
		displayName: 'Product Details',
		name: 'productDetails',
		type: '',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the quote.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'create',
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
					'quote',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: '',
				description: 'Adjustment in the grand total, if any.',
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
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'string',
				default: '',
				description: 'Exchange rate of the default currency to the home currency.',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product after deducting tax and discounts.',
			},
			{
				displayName: 'Quote Stage',
				name: 'Quote_Stage',
				type: 'string',
				default: '',
			},
			shippingAddress,
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product excluding tax.',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: '',
				description: 'Total amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Team',
				name: 'Team',
				type: 'string',
				default: '',
				description: 'Team for whom the quote is created.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the quote.',
			},
			{
				displayName: 'Valid Till',
				name: 'Valid_Till',
				type: 'string',
				default: '',
				description: 'Date until when the quote is valid.',
			},
		],
	},

	// ----------------------------------------
	//              quote: delete
	// ----------------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		description: 'ID of the quote to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                quote: get
	// ----------------------------------------
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		description: 'ID of the quote to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'quote',
				],
				operation: [
					'get',
				],
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
		description: 'ID of the quote to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'quote',
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
					'quote',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Adjustment',
				name: 'Adjustment',
				type: 'number',
				default: '',
				description: 'Adjustment in the grand total, if any.',
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
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'string',
				default: '',
				description: 'Exchange rate of the default currency to the home currency.',
			},
			{
				displayName: 'Grand Total',
				name: 'Grand_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product after deducting tax and discounts.',
			},
			productDetails,
			{
				displayName: 'Quote Stage',
				name: 'Quote_Stage',
				type: 'string',
				default: '',
			},
			shippingAddress,
			{
				displayName: 'Sub Total',
				name: 'Sub_Total',
				type: 'number',
				default: '',
				description: 'Total amount for the product excluding tax.',
			},
			{
				displayName: 'Subject',
				name: 'Subject',
				type: 'string',
				default: '',
				description: 'Subject or title of the quote.',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: '',
				description: 'Tax amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Team',
				name: 'Team',
				type: 'string',
				default: '',
				description: 'Team for whom the quote is created.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the quote.',
			},
			{
				displayName: 'Valid Till',
				name: 'Valid_Till',
				type: 'string',
				default: '',
				description: 'Date until when the quote is valid.',
			},
		],
	},
] as INodeProperties[];
