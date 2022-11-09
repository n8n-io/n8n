import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { SendInBlueNode } from './GenericFunctions';

export const attributeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attribute'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				routing: {
					request: {
						method: 'POST',
						url: '=/v3/contacts/attributes/{{$parameter.attributeCategory}}/{{encodeURI($parameter.attributeName)}}',
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
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const selectedCategory = this.getNodeParameter('attributeCategory') as string;
								const override = SendInBlueNode.INTERCEPTORS.get(selectedCategory);
								if (override) {
									override.call(this, requestOptions.body! as JsonObject);
								}

								return requestOptions;
							},
						],
					},
				},
				action: 'Create an attribute',
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v3/contacts/attributes/{{$parameter.updateAttributeCategory}}/{{encodeURI($parameter.updateAttributeName)}}',
					},
				},
				action: 'Update an attribute',
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v3/contacts/attributes/{{$parameter.deleteAttributeCategory}}/{{encodeURI($parameter.deleteAttributeName)}}',
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
				action: 'Delete an attribute',
			},
			{
				name: 'Get Many',
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
						],
					},
				},
				action: 'Get many attributes',
			},
		],
		default: 'create',
	},
];

const createAttributeOperations: INodeProperties[] = [
	{
		displayName: 'Category',
		name: 'attributeCategory',
		default: 'normal',
		description: 'Category of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Global',
				value: 'global',
			},
			{
				name: 'Normal',
				value: 'normal',
			},
			{
				name: 'Transactional',
				value: 'transactional',
			},
		],
		type: 'options',
		required: true,
	},
	{
		displayName: 'Name',
		name: 'attributeName',
		default: '',
		description: 'Name of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
			},
		},
		required: true,
		type: 'string',
	},
	{
		displayName: 'Type',
		name: 'attributeType',
		default: '',
		description: 'Attribute Type',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['normal'],
			},
		},
		options: [
			{
				name: 'Boolean',
				value: 'boolean',
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
				name: 'Text',
				value: 'text',
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
		displayName: 'Value',
		name: 'attributeValue',
		default: '',
		description: 'Value of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['global', 'calculated'],
			},
		},
		type: 'string',
		placeholder: '',
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'value',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Contact Attribute List',
		name: 'attributeCategoryList',
		type: 'collection',
		placeholder: 'Add Attributes',
		default: {},
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['create'],
				attributeCategory: ['category'],
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
								displayName: 'Value ID',
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
		displayName: 'Category',
		name: 'updateAttributeCategory',
		default: 'calculated',
		description: 'Category of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Global',
				value: 'global',
			},
		],
		type: 'options',
	},
	{
		displayName: 'Name',
		name: 'updateAttributeName',
		default: '',
		description: 'Name of the existing attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
		},
		type: 'string',
	},
	{
		displayName: 'Value',
		name: 'updateAttributeValue',
		default: '',
		description: 'Value of the attribute to update',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
			},
			hide: {
				updateAttributeCategory: ['category'],
			},
		},
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
		name: 'updateAttributeCategoryList',
		default: {},
		description: 'List of the values and labels that the attribute can take',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['update'],
				updateAttributeCategory: ['category'],
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
		displayName: 'Category',
		name: 'deleteAttributeCategory',
		default: 'normal',
		description: 'Category of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['delete'],
			},
		},
		options: [
			{
				name: 'Calculated',
				value: 'calculated',
			},
			{
				name: 'Category',
				value: 'category',
			},
			{
				name: 'Global',
				value: 'global',
			},
			{
				name: 'Normal',
				value: 'normal',
			},
			{
				name: 'Transactional',
				value: 'transactional',
			},
		],
		type: 'options',
	},
	{
		displayName: 'Name',
		name: 'deleteAttributeName',
		default: '',
		description: 'Name of the attribute',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['delete'],
			},
		},
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
				resource: ['attribute'],
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
				resource: ['attribute'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'limit',
						properties: {
							maxResults: '={{$value}}',
						},
					},
				],
			},
		},
		default: 50,
		description: 'Max number of results to return',
	},
];

export const attributeFields: INodeProperties[] = [
	...createAttributeOperations,
	...updateAttributeOperations,
	...deleteAttribueOperations,
	...getAllAttributeOperations,
];
