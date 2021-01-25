import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billAdditionalFields,
} from './BillAdditionalFields';

import {
	sortBy
} from 'lodash';

export const billOperations = [
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
] as INodeProperties[];

export const billFields = [
	// ----------------------------------
	//         bill: create
	// ----------------------------------
	{
		displayName: 'For Customer',
		name: 'CustomerRef',
		type: 'options',
		required: true,
		description: 'The customer who the estimate is for',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
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
		options: billAdditionalFields,
	},
	// ----------------------------------
	//         customer: get
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
	//         customer: getAll
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
		description: 'The number of results to return',
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
				description: 'The condition for selecting customers. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
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
		description: 'The ID of the bill to update',
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
		options: sortBy(
			[
				{
					displayName: 'Display Name',
					name: 'displayName',
					type: 'string',
					default: '',
				},
				...billAdditionalFields,
			], o => o.displayName,
		),
	},
] as INodeProperties[];
