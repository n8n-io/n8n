import {
	INodeProperties,
 } from 'n8n-workflow';

export const ecommerceProductOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ecommerceProduct',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an ecommerce product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an ecommerce product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an ecommerce product',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all ecommerce product',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const ecommerceProductFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 ecommerceProduct:create                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product Name',
		name: 'productName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'ecommerceProduct',
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
				operation: [
					'create',
				],
				resource: [
					'ecommerceProduct',
				],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Product Description',
				name: 'productDesc',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				type: 'string',
				default: '',
			},
			{
				displayName: 'Product Price',
				name: 'productPrice',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Product Short Desc',
				name: 'productShortDesc',
				type: 'string',
				default: '',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subscription Only',
				name: 'subscriptionOnly',
				type: 'boolean',
				default: false,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 ecommerceProduct:delete                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'ecommerceProduct',
				],
			},
		},
		default: '',
	},
/* -------------------------------------------------------------------------- */
/*                                 ecommerceProduct:get                       */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'ecommerceProduct',
				],
			},
		},
		default: '',
	},
/* -------------------------------------------------------------------------- */
/*                                 ecommerceProduct:getAll                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'ecommerceProduct',
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
				operation: [
					'getAll',
				],
				resource: [
					'ecommerceProduct',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'ecommerceProduct',
				],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
			},
		],
	},
];
