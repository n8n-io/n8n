import {
	INodeProperties
} from 'n8n-workflow';
import { filtersPreSendAction } from '../GenericFunctions';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				routing: {
					request: {
						method: 'POST',
						url: '/commerce/products',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/commerce/products/{{$parameter.productId}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/commerce/products/{{$parameter.productId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'products',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/commerce/products',
					},
					send: {
						paginate: true,
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/commerce/products/{{$parameter.productId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'product',
								},
							},
						],
					},
				},
			},
		],
		default: 'create',
	},
];

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'hidden',
		required: true,
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create']
			},
		},
		routing: {
			send: { type: 'body', property: 'type' }
		},
		default: 'PHYSICAL',
	},
	{
		displayName: 'Store Page ID',
		name: 'storePageId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create']
			},
		},
		routing: {
			send: { type: 'body', property: 'storePageId' }
		},
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						url: '/commerce/store_pages',
						method: 'GET',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'storePages',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.title}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		default: '',
	},
	{
		displayName: 'Variants',
		name: 'variants',
		placeholder: 'Add Variant',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
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
		default: null,
		options: [
			{
				displayName: 'Variant',
				name: 'variantValues',
				values: [
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'Merchant-defined code that identifies the product variant',
						routing: {
							send: { type: 'body', property: '=variants[{{$index}}].sku' }
						},
					},
				],
			},
		],
	},
];

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
				]
			},
		},
		default: '',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
	},
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 50,
		description: 'Max number of results to return',
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
					'product',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Modified After',
				name: 'modifiedAfter',
				type: 'dateTime',
				default: '',
				description: 'Required when modifiedBefore is used',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedAfter',
					}
				}
			},
			{
				displayName: 'Modified Before',
				name: 'modifiedBefore',
				type: 'dateTime',
				default: '',
				description: 'Required when modifiedAfter is used',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedBefore',
					}
				}
			},
		],
		routing: {
			send: {
				preSend: [
					filtersPreSendAction
				]
			}
		}
	},
];

export const productFields: INodeProperties[] = [
	...createOperations,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
];
