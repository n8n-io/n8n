import {
	INodeProperties,
} from 'n8n-workflow';

import {
	estimateAdditionalFieldsOptions,
} from './EstimateAdditionalFieldsOptions';

export const estimateOperations: INodeProperties[] = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'estimate',
				],
			},
		},
	},
];

export const estimateFields: INodeProperties[] = [
	// ----------------------------------
	//         estimate: create
	// ----------------------------------
	{
		displayName: 'For Customer',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The ID of the customer who the estimate is for.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		displayOptions: {
			show: {
				resource: [
					'estimate',
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
					'estimate',
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
					'estimate',
				],
				operation: [
					'create',
				],
			},
		},
		options: estimateAdditionalFieldsOptions,
	},

	// ----------------------------------
	//         estimate: delete
	// ----------------------------------
	{
		displayName: 'Estimate ID',
		name: 'estimateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the estimate to delete.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//         estimate: get
	// ----------------------------------
	{
		displayName: 'Estimate ID',
		name: 'estimateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the estimate to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
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
		description: 'Download the estimate as a PDF file.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
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
					'estimate',
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
					'estimate',
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
	//         estimate: getAll
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
					'estimate',
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
					'estimate',
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
				description: 'The condition for selecting estimates. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'estimate',
				],
				operation: [
					'getAll',
				],
			},
		},
	},

	// ----------------------------------
	//         estimate: send
	// ----------------------------------
	{
		displayName: 'Estimate ID',
		name: 'estimateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the estimate to send.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
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
		description: 'The email of the recipient of the estimate.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
				],
				operation: [
					'send',
				],
			},
		},
	},

	// ----------------------------------
	//         estimate: update
	// ----------------------------------
	{
		displayName: 'Estimate ID',
		name: 'estimateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the estimate to update.',
		displayOptions: {
			show: {
				resource: [
					'estimate',
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
					'estimate',
				],
				operation: [
					'update',
				],
			},
		},
		// filter out fields that cannot be updated
		options: estimateAdditionalFieldsOptions.filter(property => property.name !== 'TotalAmt' && property.name !== 'TotalTax'),
	},
];
