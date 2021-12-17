import {
	INodeProperties,
} from 'n8n-workflow';

import {
	invoiceAdditionalFieldsOptions
} from './InvoiceAdditionalFieldsOptions';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
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
				name: 'Send',
				value: 'send',
			},
			{
				name: 'Update',
				value: 'update',
			},
			{
				name: 'Void',
				value: 'void',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
	},
];

export const invoiceFields: INodeProperties[] = [
	// ----------------------------------
	//         invoice: create
	// ----------------------------------
	{
		displayName: 'For Customer',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The ID of the customer who the invoice is for.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Line',
		name: 'Line',
		type: 'collection',
		placeholder: 'Add Line Item Property',
		description: 'Individual line item of a transaction.',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
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
				displayName: 'Item',
				name: 'itemId',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getItems',
				},
			},
			{
				displayName: 'Amount',
				name: 'Amount',
				description: 'Monetary amount of the line item.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Description',
				name: 'Description',
				description: 'Textual description of the line item.',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Position',
				name: 'LineNum',
				description: 'Position of the line item relative to others.',
				type: 'number',
				default: 1,
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
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
		options: invoiceAdditionalFieldsOptions,
	},

	// ----------------------------------
	//         invoice: delete
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to delete.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//         invoice: get
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Download',
		name: 'download',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Download the invoice as a PDF file.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property to which to write to.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'get',
				],
				download: [
					true,
				],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'data.pdf',
		description: 'Name of the file that will be downloaded.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'get',
				],
				download: [
					true,
				],
			},
		},
	},

	// ----------------------------------
	//         invoice: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
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
					'invoice',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'WHERE Metadata.LastUpdatedTime > \'2021-01-01\'',
				description: 'The condition for selecting invoices. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'getAll',
				],
			},
		},
	},

	// ----------------------------------
	//         invoice: send
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to send.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		description: 'The email of the recipient of the invoice.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'send',
				],
			},
		},
	},

	// ----------------------------------
	//         invoice: void
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to void.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'void',
				],
			},
		},
	},

	// ----------------------------------
	//         invoice: update
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to update.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
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
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'update',
				],
			},
		},
		// filter out fields that cannot be updated
		options: invoiceAdditionalFieldsOptions.filter(property => property.name !== 'TotalAmt' && property.name !== 'Balance'),
	},
];
