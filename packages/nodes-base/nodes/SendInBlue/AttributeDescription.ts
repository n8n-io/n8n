import { IExecuteSingleFunctions, IHttpRequestOptions, INodeExecutionData, INodeProperties, JsonObject } from 'n8n-workflow';
import { INTERCEPTORS } from './GenericFunctions';

export const attributeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'createAttribute',
				routing: {
					request: {
						method: 'POST',
						url: '=/v3/contacts/attributes/{{$parameter.attributeCategory}}/{{$parameter.attributeName.toLowerCase()}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}', // Also possible to use the original response data
								},
							},
						],
					},
					send: {
						preSend: [
							async function(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
								const selectedCategory = this.getNodeParameter('attributeCategory') as string;
								const override = INTERCEPTORS.get(selectedCategory);
								if(override) {
									override.call(this, requestOptions.body! as JsonObject);
								}

								return requestOptions;
							},
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'updateAttribute',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v3/contacts/attributes/{{$parameter.updateAttributeCategory}}/{{$parameter.updateAttributeName.toLowerCase()}}',
					},
				},
			},
			{
				name: 'Delete',
				value: 'deleteAttribute',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v3/contacts/attributes/{{$parameter.deleteAttributeCategory}}/{{$parameter.deleteAttributeName.toLowerCase()}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}', // Also possible to use the original response data
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
						url: 'v3/contacts/attributes',
					},
					send: {
						paginate: false,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'attributes',
								},
							},
							async function (this: IExecuteSingleFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
								const returnAll = this.getNodeParameter('returnAll') as boolean;
								if(returnAll === false) {
									const limit = this.getNodeParameter('limit') as number;

									items = items.slice(0, limit);
								}

								return items;
							},
						],
					},
				},
			},
		],
		default: 'createAttribute',
	},
];

const createAttributeOperations: INodeProperties[] = [
	{
		default: 'normal',
		description: 'Category of the attribute',
		displayName: 'Category',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'createAttribute',
				],
			},
		},
		name: 'attributeCategory',
		options: [
			{
				name: 'Normal',
				value: 'normal',
			},
			{
				name: 'Transactional',
				value: 'transactional',
			},
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Global',
				value: 'global',
			},
		],
		type: 'options',
	},
	{
		default: '',
		description: 'Name of the attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'createAttribute',
				],
			},
		},
		required: true,
		name: 'attributeName',
		type: 'string',
	},
	{
		default: '',
		description: 'Attribute Type',
		displayName: 'Type',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'createAttribute',
				],
				attributeCategory: [
					'normal',
				],
			},
		},
		name: 'attributeType',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Date',
				value: 'date',
			},
			{
				name: 'Float',
				value: 'float',
			},
			{
				name: 'Boolean',
				value: 'boolean',
			},
		],
		required: true,
		type: 'options',
		routing: {
			send: {
				type: 'body',
				property: 'type',
				value: '={{$value}}',
			},
		},
	},
	{
		default: '',
		description: 'Value of the attribute',
		displayName: 'Value',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'createAttribute',
				],
				attributeCategory: [
					'global',
					'calculated',
				],
			},
		},
		name: 'attributeValue',
		type: 'string',
		placeholder: '',
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'List',
		name: 'attributeCategoryList',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'createAttribute',
				],
				attributeCategory: [
					'category',
				],
			},
		},
		options: [
			{
				displayName: 'Contact Attributes',
				name: 'categoryEnumeration',
				placeholder: 'Add Attribute',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributesValues',
						displayName: 'Attribute',
						values: [
							{
								displayName: 'Value',
								name: 'attributeCategoryValue',
								type: 'number',
								default: 1,
								description: 'ID of the value, must be numeric',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].value',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Label',
								name: 'attributeCategoryLabel',
								type: 'string',
								default: '',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].label',
										type: 'body',
									},
								},
								description: 'Label of the value',
							},
						],
					},
				],
				default: {},
				description: 'List of values and labels that the attribute can take',
			},
		],
	},
];

const updateAttributeOperations: INodeProperties[] = [
	{
		default: '',
		description: 'Category of the attribute',
		displayName: 'Category',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'updateAttribute',
				],
			},
		},
		name: 'updateAttributeCategory',
		options: [
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Global',
				value: 'global',
			},
		],
		type: 'options',
	},
	{
		default: '',
		description: 'Name of the existing attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'updateAttribute',
				],
			},
		},
		name: 'updateAttributeName',
		type: 'string',
	},
	{
		default: '',
		description: 'Value of the attribute to update',
		displayName: 'Value',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'updateAttribute',
				],
				attributeCategory: [
					'global',
					'calculated',
				],
			},
		},
		name: 'updateAttributeValue',
		type: 'string',
		placeholder: '',
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Update Fields',
		description: 'List of the values and labels that the attribute can take',
		name: 'updateAttributeCategoryList',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'updateAttribute',
				],
				updateAttributeCategory: [
					'category',
				],
			},
		},
		options: [
			{
				displayName: 'Contact Attributes',
				name: 'updateCategoryEnumeration',
				placeholder: 'Add Attribute',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'updateAttributesValues',
						displayName: 'Attribute',
						values: [
							{
								displayName: 'Value',
								name: 'attributeCategoryValue',
								type: 'number',
								default: 1,
								description: 'ID of the value, must be numeric',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].value',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Label',
								name: 'attributeCategoryLabel',
								type: 'string',
								default: '',
								routing: {
									send: {
										value: '={{$value}}',
										property: '=enumeration[{{$index}}].label',
										type: 'body',
									},
								},
								description: 'Label of the value',
							},
						],
					},
				],
				default: {},
				description: 'List of values and labels that the attribute can take',
			},
		],
	},
];

const deleteAttribueOperations: INodeProperties[] = [
	{
		default: 'normal',
		description: 'Category of the attribute',
		displayName: 'Category',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'deleteAttribute',
				],
			},
		},
		name: 'deleteAttributeCategory',
		options: [
			{
				name: 'Normal',
				value: 'normal',
			},
			{
				name: 'Transactional',
				value: 'transactional',
			},
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Global',
				value: 'global',
			},
		],
		type: 'options',
	},
	{
		default: '',
		description: 'Name of the attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'deleteAttribute',
				],
			},
		},
		name: 'deleteAttributeName',
		type: 'string',
	},
];

const getAllAttributeOperations: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'attribute',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'attribute',
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
			maxValue: 1000,
		},
		default: 10,
		description: 'Max number of results to return',
	},
];

export const attributeFields: INodeProperties[] = [
	...createAttributeOperations,
	...updateAttributeOperations,
	...deleteAttribueOperations,
	...getAllAttributeOperations,
];
