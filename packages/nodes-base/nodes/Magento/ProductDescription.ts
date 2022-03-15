import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getProductOptionalFields,
	getSearchFilters,
} from './GenericFunctions';

export const productOperations: INodeProperties[] = [
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all producs',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
];

export const productFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                   product:create			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		default: '',
		required: true,
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
		description: 'Stock-keeping unit of the product',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
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
		displayName: 'Attribute Set Name/ID',
		name: 'attributeSetId',
		type: 'options',
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
		typeOptions: {
			loadOptionsMethod: 'getAttributeSets',
		},
		default: '',
	},
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
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
		default: 0,
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
		description: 'Stock-keeping unit of the product',
	},

	/* -------------------------------------------------------------------------- */
	/*                                   product:getAll			                  */
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
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether all results should be returned or only up to a given limit',
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
		description: 'How many results to return',
	},
	...getSearchFilters(
		'product',
		//'getProductAttributesFields',
		'getFilterableProductAttributes',
		'getSortableProductAttributes'),

];
