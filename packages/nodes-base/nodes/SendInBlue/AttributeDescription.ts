import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
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
				value: 'createAttribute',
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
				value: 'updateAttribute',
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
				value: 'deleteAttribute',
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
							async function (
								this: IExecuteSingleFunctions,
								items: INodeExecutionData[],
							): Promise<INodeExecutionData[]> {
								const returnAll = this.getNodeParameter('returnAll') as boolean;
								if (returnAll === false) {
									const limit = this.getNodeParameter('limit') as number;

									items = items.slice(0, limit);
								}

								return items;
							},
						],
					},
				},
				action: 'Get all attributes',
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
				resource: ['attribute'],
				operation: ['createAttribute'],
			},
		},
		name: 'attributeCategory',
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
		default: '',
		description: 'Name of the attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['createAttribute'],
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
				resource: ['attribute'],
				operation: ['createAttribute'],
				attributeCategory: ['normal'],
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
				resource: ['attribute'],
				operation: ['createAttribute'],
				attributeCategory: ['global', 'calculated'],
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
		displayName: 'Contact Attribute List',
		name: 'attributeCategoryList',
		type: 'collection',
		placeholder: 'Add Attributes',
		default: {},
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['createAttribute'],
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
		default: 'calculated',
		description: 'Category of the attribute',
		displayName: 'Category',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['updateAttribute'],
			},
		},
		name: 'updateAttributeCategory',
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
		default: '',
		description: 'Name of the existing attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['updateAttribute'],
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
				resource: ['attribute'],
				operation: ['updateAttribute'],
			},
			hide: {
				updateAttributeCategory: ['category'],
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
				resource: ['attribute'],
				operation: ['updateAttribute'],
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
		default: 'normal',
		description: 'Category of the attribute',
		displayName: 'Category',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['deleteAttribute'],
			},
		},
		name: 'deleteAttributeCategory',
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
		default: '',
		description: 'Name of the attribute',
		displayName: 'Name',
		displayOptions: {
			show: {
				resource: ['attribute'],
				operation: ['deleteAttribute'],
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
