import { INodeProperties } from "n8n-workflow";

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
						url: '=/v3/contacts/attributes/{{$parameter.attributeCategory}}/{{$parameter.attributeName.toLowerCase()}}'
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": $response.body } }}',
								},
							},
						]
					}
				},
			},
			{
				name: 'Update',
				value: 'updateAttribute',
				routing: {
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": $response.body } }}', // Also possible to use the original response data
								},
							},
						]
					},
				}
			},
			{
				name: 'Delete',
				value: 'deleteAttribute',
				routing: {
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": $response.body } }}', // Also possible to use the original response data
								},
							},
						]
					},
				}
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
							}
						],
					},
				}
			}
		],
		default: 'createAttribute'
	}
];

const createAttributeOperations: Array<INodeProperties> = [
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
					'category',
					'transactional'
				]
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
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Category',
				value: 'category',
			},
		],
		type: 'options',
		routing: {
			send: {
				type: "body",
				property: 'type',
				value: '={{$value}}'
			}
		}
	},
	{
		default: '',
		description: 'Value of the attribute',
		displayName: 'Value',
		displayOptions: {
			show: {
				attributeCategory: [
					'global',
					'calculated'
				]
			}
		},
		name: 'attributeValue',
		type: 'string',
		placeholder: 'COUNT[BLACKLISTED,BLACKLISTED,<,NOW()]',
		routing: {
			send: {
				type: "body",
				property: 'value',
				value: '={{$value}}'
			}
		}
	}
];

export const attributeFields: INodeProperties[] = [
	...createAttributeOperations
];
