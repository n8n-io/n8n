import {
	INodeProperties,
} from 'n8n-workflow';

import {
	estimateAdditionalFields,
} from './EstimateAdditionalFields';

export const estimateOperations = [
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
] as INodeProperties[];

export const estimateFields = [
	// ----------------------------------
	//         estimate: create
	// ----------------------------------
	{
		displayName: 'For Customer',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The customer who the estimate is for',
		default: '', // TODO: What to set here?
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
		displayName: 'Estimate Line',
		name: 'Line',
		type: 'collection',
		placeholder: 'Add Line Item Property',
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
				displayName: 'Type',
				name: 'DetailType',
				type: 'options',
				default: 'DescriptionOnlyLine',
				options: [
					{
						name: 'Description Only Line',
						value: 'DescriptionOnlyLine',
					},
					{
						name: 'Discount Line',
						value: 'DiscountLine',
					},
					{
						name: 'Group Line',
						value: 'GroupLine',
					},
					{
						name: 'Sales Item Line',
						value: 'SalesItemLine',
					},
					{
						name: 'Subtotal Line',
						value: 'SubTotalLine',
					},
				],
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Position',
				name: 'LineNum',
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
		options: estimateAdditionalFields,
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
				resource: [
					'estimate',
				],
				operation: [
					'get',
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
		description: 'Return all results',
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
		description: 'The number of results to return',
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
				description: 'The condition for selecting estimates. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
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
	//         customer: update
	// ----------------------------------
	// {
	// 	displayName: 'Customer ID',
	// 	name: 'customerId',
	// 	type: 'string',
	// 	required: true,
	// 	default: '',
	// 	description: 'The ID of the customer to update',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'customer',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Update Fields',
	// 	name: 'updateFields',
	// 	type: 'collection',
	// 	placeholder: 'Add Field',
	// 	default: {},
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'customer',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			displayName: 'Display name',
	// 			name: 'displayName',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 		...customerAdditionalFields,
	// 	],
	// },
] as INodeProperties[];
