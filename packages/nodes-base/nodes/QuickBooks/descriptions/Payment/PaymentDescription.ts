import {
	INodeProperties,
} from 'n8n-workflow';

import {
	paymentAdditionalFieldsOptions
} from './PaymentAdditionalFieldsOptions';

export const paymentOperations: INodeProperties[] = [
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
					'payment',
				],
			},
		},
	},
];

export const paymentFields: INodeProperties[] = [
	// ----------------------------------
	//         payment: create
	// ----------------------------------
	{
		displayName: 'For Customer ID',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The ID of the customer who the payment is for.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Total Amount',
		name: 'TotalAmt',
		description: 'Total amount of the transaction.',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'payment',
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
					'payment',
				],
				operation: [
					'create',
				],
			},
		},
		options: paymentAdditionalFieldsOptions,
	},

	// ----------------------------------
	//         payment: delete
	// ----------------------------------
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the payment to delete.',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//         payment: get
	// ----------------------------------
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the payment to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'payment',
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
					'payment',
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
					'payment',
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
					'payment',
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
	//         payment: getAll
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
					'payment',
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
					'payment',
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
				description: 'The condition for selecting payments. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},

	// ----------------------------------
	//         payment: send
	// ----------------------------------
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the payment to send.',
		displayOptions: {
			show: {
				resource: [
					'payment',
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
		description: 'The email of the recipient of the payment.',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'send',
				],
			},
		},
	},

	// ----------------------------------
	//         payment: void
	// ----------------------------------
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the payment to void.',
		displayOptions: {
			show: {
				resource: [
					'payment',
				],
				operation: [
					'void',
				],
			},
		},
	},

	// ----------------------------------
	//         payment: update
	// ----------------------------------
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the payment to update.',
		displayOptions: {
			show: {
				resource: [
					'payment',
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
					'payment',
				],
				operation: [
					'update',
				],
			},
		},
		options: paymentAdditionalFieldsOptions,
	},
];
