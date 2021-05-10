import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billingAddress,
	makeGetAllFields,
	makeProductDetails,
	shippingAddress,
} from './SharedFields';

export const salesOrderOperations = [
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

export const salesOrderFields = [
	// ----------------------------------------
	//            salesOrder: create
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
				],
			},
		},
	},
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
	makeProductDetails('salesOrder', 'create'),
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
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
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
				description: 'Commission of sales person on deal closure.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
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
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
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
				description: 'Commission of sales person on deal closure.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
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
] as INodeProperties[];
