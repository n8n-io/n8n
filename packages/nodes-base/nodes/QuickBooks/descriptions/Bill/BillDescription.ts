import type { INodeProperties } from 'n8n-workflow';

import { billAdditionalFieldsOptions } from './BillAdditionalFieldsOptions';

export const billOperations: INodeProperties[] = [
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
				action: 'Create a bill',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a bill',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a bill',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many bills',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a bill',
			},
		],
		displayOptions: {
			show: {
				resource: ['bill'],
			},
		},
	},
];

export const billFields: INodeProperties[] = [
	// ----------------------------------
	//         bill: create
	// ----------------------------------
	{
		displayName: 'For vendor name or ID',
		name: 'VendorRef',
		type: 'options',
		required: true,
		description:
			'The ID of the vendor who the bill is for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getVendors',
		},
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Line',
		name: 'Line',
		type: 'collection',
		placeholder: 'Add line item property',
		description: 'Individual line item of a transaction',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				default: '',
			},
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
				displayName: 'Detail type',
				name: 'DetailType',
				type: 'options',
				default: 'ItemBasedExpenseLineDetail',
				options: [
					{
						name: 'Account-based expense line detail',
						value: 'AccountBasedExpenseLineDetail',
					},
					{
						name: 'Item-based expense line detail',
						value: 'ItemBasedExpenseLineDetail',
					},
				],
			},
			{
				displayName: 'Item name or ID',
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
		],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['create'],
			},
		},
		options: billAdditionalFieldsOptions,
	},

	// ----------------------------------
	//         bill: delete
	// ----------------------------------
	{
		displayName: 'Bill ID',
		name: 'billId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bill to delete',
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//         bill: get
	// ----------------------------------
	{
		displayName: 'Bill ID',
		name: 'billId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bill to retrieve',
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//         bill: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['bill'],
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
				resource: ['bill'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: "WHERE Metadata.LastUpdatedTime > '2021-01-01'",
				description:
					'The condition for selecting bills. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
			},
		],
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------
	//         bill: update
	// ----------------------------------
	{
		displayName: 'Bill ID',
		name: 'billId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bill to update',
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		required: true,
		displayOptions: {
			show: {
				resource: ['bill'],
				operation: ['update'],
			},
		},
		// filter out fields that cannot be updated
		options: billAdditionalFieldsOptions.filter(
			(property) => property.name !== 'TotalAmt' && property.name !== 'Balance',
		),
	},
];
