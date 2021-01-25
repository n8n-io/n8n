import {
	INodeProperties,
} from 'n8n-workflow';

import {
	billAdditionalFieldsOptions,
} from './BillAdditionalFieldsOptions';

import {
	lineProperty,
} from '../SharedDescription';

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
		displayName: 'For Vendor',
		name: 'VendorRef',
		type: 'options',
		required: true,
		description: 'The vendor who the bill is for.',
		default: '',
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
	lineProperty,
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
				description: 'The condition for selecting bills. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
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
		options: sortBy(
			[
				{
					displayName: 'For Vendor',
					name: 'vendorRef',
					type: 'string',
					default: '',
				},
				lineProperty,
				...billAdditionalFieldsOptions,
			], o => o.displayName,
		),
	},
] as INodeProperties[];
