import type { INodeProperties } from 'n8n-workflow';

import { makeCustomFieldsFixedCollection, makeGetAllFields } from './SharedFields';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['product'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
				action: 'Create a product',
			},
			{
				name: 'Create or update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
				action: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
				action: 'Get a product',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many products',
				action: 'Get many products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
				action: 'Update a product',
			},
		],
		default: 'create',
	},
];

export const productFields: INodeProperties[] = [
	// ----------------------------------------
	//           product: create
	// ----------------------------------------
	{
		displayName: 'Product name',
		name: 'productName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------------
	//            product: upsert
	// ----------------------------------------
	{
		displayName: 'Product name',
		name: 'productName',
		description:
			'Name of the product. If a record with this product name exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['upsert'],
			},
		},
	},

	// ----------------------------------------
	//         product: create + upsert
	// ----------------------------------------
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create', 'upsert'],
			},
		},
		options: [
			{
				displayName: 'Commission rate',
				name: 'Commission_Rate',
				type: 'number',
				description: 'Commission rate for the product. For example, enter 12 for 12%.',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			makeCustomFieldsFixedCollection('product'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Manufacturer',
				name: 'Manufacturer',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Product active',
				name: 'Product_Active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Product category',
				name: 'Product_Category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quantity in demand',
				name: 'Qty_in_Demand',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Quantity in stock',
				name: 'Qty_in_Stock',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Taxable',
				name: 'Taxable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Unit price',
				name: 'Unit_Price',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},

	// ----------------------------------------
	//             product: delete
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               product: get
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             product: getAll
	// ----------------------------------------
	...makeGetAllFields('product'),

	// ----------------------------------------
	//             product: update
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
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
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Commission rate',
				name: 'Commission_Rate',
				type: 'number',
				description: 'Commission rate for the product. For example, enter 12 for 12%.',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			makeCustomFieldsFixedCollection('product'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Manufacturer',
				name: 'Manufacturer',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Product active',
				name: 'Product_Active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Product category',
				name: 'Product_Category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quantity in demand',
				name: 'Qty_in_Demand',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Quantity in stock',
				name: 'Qty_in_Stock',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Taxable',
				name: 'Taxable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Unit price',
				name: 'Unit_Price',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},
];
