import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billingAddress,
	makeGetAllFields,
	productDetails,
	shippingAddress,
} from './SharedFields';

export const purchaseOrderOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
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

export const purchaseOrderFields = [
	// ----------------------------------------
	//          purchaseOrder: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject or title of the purchase order.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Vendor Name',
		name: 'vendorName',
		type: '',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
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
					'purchaseOrder',
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
			{
				displayName: 'Billing Address',
				name: 'Billing_Address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Billing Address Field',
				options: [
					{
						displayName: 'Billing Address Fields',
						name: 'billing_address_fields',
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
			},
			{
				displayName: 'Carrier',
				name: 'Carrier',
				type: 'string',
				default: '',
				description: 'Name of the carrier.',
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
				displayName: 'Discount',
				name: 'Discount',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'Due_Date',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
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
				displayName: 'PO Date',
				name: 'PO_Date',
				type: 'string',
				default: '',
				description: 'Date on which the purchase order was issued.',
			},
			{
				displayName: 'PO Number',
				name: 'PO_Number',
				type: 'string',
				default: '',
				description: 'ID of the purchase order after creating a case.',
			},
			productDetails,
			{
				displayName: 'Sales Commission',
				name: 'Sales_Commission',
				type: 'string',
				default: '',
				description: 'Commission of sales person on deal closure.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
				description: 'Status of the purchase order.',
			},
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
				description: 'Tax amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the purchase order.',
			},
			{
				displayName: 'Tracking Number',
				name: 'Tracking_Number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//          purchaseOrder: delete
	// ----------------------------------------
	{
		displayName: 'Purchase Order ID',
		name: 'purchaseOrderId',
		description: 'ID of the purchase order to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//            purchaseOrder: get
	// ----------------------------------------
	{
		displayName: 'Purchase Order ID',
		name: 'purchaseOrderId',
		description: 'ID of the purchase order to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//          purchaseOrder: getAll
	// ----------------------------------------
	...makeGetAllFields('purchaseOrder'),

	// ----------------------------------------
	//          purchaseOrder: update
	// ----------------------------------------
	{
		displayName: 'Purchase Order ID',
		name: 'purchaseOrderId',
		description: 'ID of the purchase order to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'purchaseOrder',
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
					'purchaseOrder',
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
				description: 'Name of the carrier.',
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
				displayName: 'Discount',
				name: 'Discount',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'Due_Date',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
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
				displayName: 'PO Date',
				name: 'PO_Date',
				type: 'string',
				default: '',
				description: 'Date on which the purchase order was issued.',
			},
			{
				displayName: 'PO Number',
				name: 'PO_Number',
				type: 'string',
				default: '',
				description: 'ID of the purchase order after creating a case.',
			},
			productDetails,
			{
				displayName: 'Sales Commission',
				name: 'Sales_Commission',
				type: 'string',
				default: '',
				description: 'Commission of sales person on deal closure.',
			},
			shippingAddress,
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
				description: 'Status of the purchase order.',
			},
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
				description: 'Subject or title of the purchase order.',
			},
			{
				displayName: 'Tax',
				name: 'Tax',
				type: 'number',
				default: '',
				description: 'Tax amount as the sum of sales tax and value-added tax.',
			},
			{
				displayName: 'Terms and Conditions',
				name: 'Terms_and_Conditions',
				type: 'string',
				default: '',
				description: 'Terms and conditions associated with the purchase order.',
			},
			{
				displayName: 'Tracking Number',
				name: 'Tracking_Number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Vendor Name',
				name: 'Vendor_Name',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Vendor Name Field',
				options: [
					{
						displayName: 'Vendor Name Fields',
						name: 'vendor_name_fields',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
