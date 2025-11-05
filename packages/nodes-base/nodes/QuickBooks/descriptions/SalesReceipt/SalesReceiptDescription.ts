import type { INodeProperties } from 'n8n-workflow';

import { salesReceiptAdditionalFieldsOptions } from './SalesReceiptAdditionalFieldsOptions';

export const salesReceiptOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a sales receipt',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a sales receipt',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesReceipt'],
			},
		},
	},
];

export const salesReceiptFields: INodeProperties[] = [
	// ----------------------------------
	//         salesReceipt: create
	// ----------------------------------
	{
		displayName: 'For Customer Name or ID',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description:
			'The ID of the customer who the sales receipt is for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		displayOptions: {
			show: {
				resource: ['salesReceipt'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Line',
		name: 'Line',
		type: 'collection',
		placeholder: 'Add Line Item Property',
		description: 'Individual line item of a transaction',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['salesReceipt'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'Amount',
				description: 'Monetary amount of the line item',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Description',
				name: 'Description',
				description: 'Textual description of the line item',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Detail Type',
				name: 'DetailType',
				type: 'options',
				default: 'SalesItemLineDetail',
				options: [
					{
						name: 'Sales Item Line Detail',
						value: 'SalesItemLineDetail',
					},
				],
			},
			{
				displayName: 'Item Name or ID',
				name: 'itemId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getItems',
				},
			},
			{
				displayName: 'Position',
				name: 'LineNum',
				description: 'Position of the line item relative to others',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Tax Code Ref Name or ID',
				name: 'TaxCodeRef',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTaxCodeRefs',
				},
			},
			{
				displayName: 'Quantity',
				name: 'Qty',
				description: 'Number of units of the line item',
				type: 'number',
				default: 0,
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['salesReceipt'],
				operation: ['create'],
			},
		},
		options: salesReceiptAdditionalFieldsOptions,
	},

	// ----------------------------------
	//         salesReceipt: delete
	// ----------------------------------
	{
		displayName: 'Sales Receipt ID',
		name: 'salesreceiptId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the sales receipt to delete',
		displayOptions: {
			show: {
				resource: ['salesReceipt'],
				operation: ['delete'],
			},
		},
	},
];
