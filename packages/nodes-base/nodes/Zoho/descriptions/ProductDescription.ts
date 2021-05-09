import {
	INodeProperties,
} from 'n8n-workflow';

import {
	makeGetAllFields,
} from './SharedFields';

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
] as INodeProperties[];

export const productFields = [
	// ----------------------------------------
	//             product: create
	// ----------------------------------------
	{
		displayName: 'Product Name',
		name: 'productName',
		type: 'string',
		required: true,
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
			{
				displayName: 'Commission Rate',
				name: 'Commission_Rate',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
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
				displayName: 'Product Active',
				name: 'Product_Active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Product Category',
				name: 'Product_Category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quantity in Demand',
				name: 'Qty_in_Demand',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Quantity in Stock',
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
				displayName: 'Unit Price',
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
		description: 'ID of the product to delete.',
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
				],
			},
		},
	},

	// ----------------------------------------
	//               product: get
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				],
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
		description: 'ID of the product to update.',
		type: 'string',
		required: true,
		default: '',
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
			{
				displayName: 'Commission Rate',
				name: 'Commission_Rate',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
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
				displayName: 'Product Active',
				name: 'Product_Active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Product Category',
				name: 'Product_Category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quantity in Demand',
				name: 'Qty_in_Demand',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Quantity in Stock',
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
				displayName: 'Unit Price',
				name: 'Unit_Price',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
		],
	},
] as INodeProperties[];
