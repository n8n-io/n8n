import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getAddressesUi,
	getCustomerOptionalFields,
	getProductOptionalFields,
	getSearchFilters,
} from './GenericFunctions';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search producs',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const productFields = [

	/* -------------------------------------------------------------------------- */
	/*                                   product:create			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
	},
	{
		displayName: 'Attribute Set ID',
		name: 'attributeSetId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAttributeSets',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
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
					'product',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			...getProductOptionalFields(),
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			...getProductOptionalFields(),
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   product:delete			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   product:search			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'search',
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
					'product',
				],
				operation: [
					'search',
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
	...getSearchFilters('product', 'getProductAttributes'),

] as INodeProperties[];
