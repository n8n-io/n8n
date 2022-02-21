import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billAdditionalFieldsOptions,
} from './BillAdditionalFieldsOptions';

export const billOperations: INodeProperties[] = [
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
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'bill',
				],
			},
		},
	},
];

export const billFields: INodeProperties[] = [
	// ----------------------------------
	//         bill: create
	// ----------------------------------
	{
		displayName: 'For Vendor',
		name: 'VendorRef',
		type: 'options',
		required: true,
		description: 'The ID of the vendor who the bill is for.',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getVendors',
		},
		displayOptions: {
			show: {
				resource: [
					'bill',
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
					'bill',
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
				default: 'ItemBasedExpenseLineDetail',
				options: [
					{
						name: 'Account-Based Expense Line Detail',
						value: 'AccountBasedExpenseLineDetail',
					},
					{
						name: 'Item-Based Expense Line Detail',
						value: 'ItemBasedExpenseLineDetail',
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
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				default: '',
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
					'bill',
				],
				operation: [
					'create',
				],
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
		description: 'The ID of the bill to delete.',
		displayOptions: {
			show: {
				resource: [
					'bill',
				],
				operation: [
					'delete',
				],
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
		description: 'The ID of the bill to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'bill',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//         bill: getAll
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
					'bill',
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
					'bill',
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
				description: 'The condition for selecting bills. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'bill',
				],
				operation: [
					'getAll',
				],
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
		description: 'The ID of the bill to update.',
		displayOptions: {
			show: {
				resource: [
					'bill',
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
					'bill',
				],
				operation: [
					'update',
				],
			},
		},
		// filter out fields that cannot be updated
		options: billAdditionalFieldsOptions.filter(property => property.name !== 'TotalAmt' && property.name !== 'Balance'),
	},
];
