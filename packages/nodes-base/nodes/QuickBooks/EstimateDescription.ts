import {
	INodeProperties,
} from 'n8n-workflow';

import {
	estimateAdditionalFields,
} from './EstimateAdditionalFields';

import {
	estimateLine
} from './EstimateLine';

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
				name: 'Get PDF',
				value: 'getPdf',
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
		default: '', // TODO: `The value "" is not supported!`
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
	estimateLine,
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
					'getPdf',
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
	{
		displayName: 'Estimate ID',
		name: 'estimateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the estimate to update',
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
		options: [
			{
				displayName: 'For Customer',
				name: 'CustomerRef',
				type: 'options',
				required: true,
				description: 'The customer who the estimate is for',
				default: '', // TODO: `The value "" is not supported!`
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
			estimateLine,
			...estimateAdditionalFields,
		],
	},
] as INodeProperties[];
