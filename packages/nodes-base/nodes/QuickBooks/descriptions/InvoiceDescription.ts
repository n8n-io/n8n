import {
	INodeProperties,
} from 'n8n-workflow';

import {
	line,
} from './LineDescription';

import {
	invoiceAdditionalFields
} from './InvoiceAdditionalFields';

export const invoiceOperations = [
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
				name: 'Void',
				value: 'void',
			},
			{
				name: 'Update',
				value: 'update',
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
] as INodeProperties[];

export const invoiceFields = [
	// ----------------------------------
	//         invoice: create
	// ----------------------------------
	{
		displayName: 'For Customer',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The customer who the invoice is for',
		default: '',
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
	line,
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
		options: invoiceAdditionalFields,
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
		description: 'The ID of the invoice to retrieve',
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
		description: 'Download estimate as PDF file',
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
		description: 'Name of the binary property to which to write to',
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
		description: 'Return all results',
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
		description: 'The number of results to return',
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
				description: 'The condition for selecting invoices. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
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
		description: 'The ID of the invoice to send',
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
		description: 'The email of the recipient of the invoice',
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
	//         invoice: update
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the invoice to update',
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
		options: [
			{
				displayName: 'For Customer',
				name: 'CustomerRef',
				type: 'options',
				required: true,
				description: 'The customer who the invoice is for',
				default: '',
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
			line,
			...invoiceAdditionalFields,
		],
	},
] as INodeProperties[];
