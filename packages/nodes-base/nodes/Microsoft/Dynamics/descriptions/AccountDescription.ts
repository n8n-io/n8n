import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getAccountFields,
} from '../GenericFunctions';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
			},
		},
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
		default: 'create',
		description: 'Operation to perform',
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------------
	//             account:create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Company or business name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'account',
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
					'account',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			...getAccountFields(),
		],
	},
	// ----------------------------------------
	//             account:get
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'delete',
					'get',
					'update',
				],
			},
		},
	},
	// ----------------------------------------
	//             account:getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAccountFields',
				},
				default: '',
			},
			{
				displayName: 'Expand Fields',
				name: 'expandFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getExpandableAccountFields',
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Query to filter the results. Check <a href="https://docs.microsoft.com/en-us/powerapps/developer/data-platform/webapi/query-data-web-api#filter-results" target="_blank">filters</a>',
			},
		],
	},

	// ----------------------------------------
	//             account:update
	// ----------------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			...getAccountFields(),
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAccountFields',
				},
				default: '',
				description: 'Fields the response will include',
			},
		],
	},
];
