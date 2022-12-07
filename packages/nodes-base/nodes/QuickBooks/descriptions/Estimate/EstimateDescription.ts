import { INodeProperties } from 'n8n-workflow';

import { estimateAdditionalFieldsOptions } from './EstimateAdditionalFieldsOptions';

export const estimateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an estimate',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an estimate',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an estimate',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many estimates',
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send an estimate',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an estimate',
			},
		],
		displayOptions: {
			show: {
				resource: ['estimate'],
			},
		},
	},
];

export const estimateFields: INodeProperties[] = [
	// ----------------------------------
	//         estimate: create
	// ----------------------------------
	{
		displayName: 'For Customer Name or ID',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description:
			'The ID of the customer who the estimate is for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		displayOptions: {
			show: {
				resource: ['estimate'],
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
				resource: ['estimate'],
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
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTaxCodeRefs',
				},
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
				resource: ['estimate'],
				operation: ['create'],
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
		description: 'The ID of the estimate to delete',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['delete'],
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
		description: 'The ID of the estimate to retrieve',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Download',
		name: 'download',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether to download the estimate as a PDF file',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['get'],
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
				resource: ['estimate'],
				operation: ['get'],
				download: [true],
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
		description: 'Name of the file that will be downloaded',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['get'],
				download: [true],
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
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['getAll'],
				returnAll: [false],
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
				placeholder: "WHERE Metadata.LastUpdatedTime > '2021-01-01'",
				description:
					'The condition for selecting estimates. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
			},
		],
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['getAll'],
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
		description: 'The ID of the estimate to send',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['send'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		description: 'The email of the recipient of the estimate',
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['send'],
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
		description: 'The ID of the estimate to update',
		displayOptions: {
			show: {
				resource: ['estimate'],
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
		required: true,
		displayOptions: {
			show: {
				resource: ['estimate'],
				operation: ['update'],
			},
		},
		// filter out fields that cannot be updated
		options: estimateAdditionalFieldsOptions.filter(
			(property) => property.name !== 'TotalAmt' && property.name !== 'TotalTax',
		),
	},
];
