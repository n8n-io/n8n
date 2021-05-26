import {
	INodeProperties,
} from 'n8n-workflow';

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
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const productFields = [
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
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
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
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
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
	},
] as INodeProperties[];
