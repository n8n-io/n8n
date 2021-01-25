import {
	INodeProperties,
} from 'n8n-workflow';

import {
	itemAdditionalFieldsOptions,
} from './ItemAdditionalFieldsOptions';

import {
	sortBy
} from 'lodash';

export const itemOperations = [
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
					'item',
				],
			},
		},
	},
] as INodeProperties[];

export const itemFields = [
	// ----------------------------------
	//         item: create
	// ----------------------------------
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		required: true,
		default: '',
		description: 'The display name of the item to create.',
		displayOptions: {
			show: {
				resource: [
					'item',
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
					'item',
				],
				operation: [
					'create',
				],
			},
		},
		options: itemAdditionalFieldsOptions,
	},
	// ----------------------------------
	//         item: get
	// ----------------------------------
	{
		displayName: 'item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the item to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------
	//         item: getAll
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
					'item',
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
					'item',
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
				description: 'The condition for selecting items. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">guide</a> for supported syntax.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
		],
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	// ----------------------------------
	//         item: update
	// ----------------------------------
	{
		displayName: 'item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the item to update.',
		displayOptions: {
			show: {
				resource: [
					'item',
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
					'item',
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
				...itemAdditionalFieldsOptions,
			], o => o.displayName,
		),
	},
] as INodeProperties[];
