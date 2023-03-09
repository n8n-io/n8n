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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create']
			},
		},
		routing: {
			send: { type: 'body', property: 'name' }
		},
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
						required: true,
						routing: {
							send: { type: 'body', property: '=variants[{{$index}}].sku' }
						},
					},
					{
						displayName: 'Base Price',
						name: 'basePrice',
						placeholder: 'Add Base Price',
						type: 'fixedCollection',
						default: null,
						required: true,
						typeOptions: {
							multipleValues: false,
						},
						description: 'Amount per unit to charge for the variant',
						options: [
							{
								name: 'basePriceValues',
								displayName: 'Base Price',
								values: [
									{
										displayName: 'Currency',
										name: 'currency',
										type: 'string',
										default: '',
										description: 'ISO 4217 currency code string like "USD" or "EUR"',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].pricing.basePrice.currency' }
										},
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Amount has no currency markers and conforms to the selected. ISO currency\'s precision (e.g., JPY as 123; USD as 123.00 or 123). Amount must not be more than 1,000,000.',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].pricing.basePrice.value' }
										},
									},
								],
							},
						],
					},
					{
						displayName: 'On Sale',
						name: 'onSale',
						type: 'boolean',
						default: false,
						description: 'Whether the variant is sold according to its sale price',
						routing: {
							send: { type: 'body', property: '=variants[{{$index}}].pricing.onSale' }
						},
					},
					{
						displayName: 'Sale Price',
						name: 'salePrice',
						placeholder: 'Add Sale Price',
						type: 'fixedCollection',
						default: {},
						required: true,
						typeOptions: {
							multipleValues: false,
						},
						description: 'Amount per unit charged when the variant is on sale',
						options: [
							{
								name: 'salePriceValues',
								displayName: 'Sale Price',
								values: [
									{
										displayName: 'Currency',
										name: 'currency',
										type: 'string',
										default: '',
										description: 'ISO 4217 currency code string like "USD" or "EUR"',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].pricing.salePrice.currency' }
										},
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Amount has no currency markers and conforms to the selected. ISO currency\'s precision (e.g., JPY as 123; USD as 123.00 or 123). Amount must not be more than 1,000,000.',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].pricing.salePrice.value' }
										},
									},
								],
							},
						],
					},
					{
						displayName: 'Stock',
						name: 'stock',
						placeholder: 'Add Stock',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: false,
						},
						description: 'If stock isn\'t provided, then the new variant uses the default values',
						options: [
							{
								name: 'stockValues',
								displayName: 'Stock',
								values: [
									{
										displayName: 'Quantity',
										name: 'quantity',
										type: 'number',
										default: '',
										description: 'Number of units that can be purchased',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].stock.quantity' }
										},
									},
									{
										displayName: 'Unlimited',
										name: 'unlimited',
										type: 'boolean',
										default: false,
										description: 'Whether the quantity is unlimited or not',
										required: true,
										routing: {
											send: { type: 'body', property: '=variants[{{$index}}].stock.unlimited' }
										},
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create']
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Long-form product description represented in HTML',
				routing: {
					send: { type: 'body', property: 'description' }
				},
			},
			{
				displayName: 'Is Visible',
				name: 'isVisible',
				type: 'boolean',
				default: false,
				description: 'Whether the product is available for purchase',
				routing: {
					send: { type: 'body', property: 'isVisible' }
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Tag',
				},
				default: [],
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					}
				},
			},
			{
				displayName: 'URL Slug',
				name: 'urlSlug',
				type: 'string',
				default: '',
				description: 'Value can only consist of alphanumeric characters and non-contiguous hyphens',
				routing: {
					send: { type: 'body', property: 'urlSlug' }
				},
			},
			{
				displayName: 'Variant Attributes',
				name: 'variantAttributes',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Variant Attribute',
				},
				description: 'List of attributes to distinguish variants of the product',
				default: [],
				routing: {
					send: {
						type: 'body',
						property: 'variantAttributes',
					}
				},
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
