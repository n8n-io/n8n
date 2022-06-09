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
		displayName: 'Attribute Info',
		name: 'attribute',
		type: 'collection',
		default: {},
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
		options: [
			{
				default: 'normal',
				description: 'Category of the attribute',
				displayName: 'Category',
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
				name: 'attributeName',
				type: 'string',
			}
		],
		routing: {
			request: {
				method: 'POST',
				url: '=/v3/contacts/attributes/{{$parameter.attributeCategory}}/{{$parameter.attributeName}}'
			},
			output: {
				postReceive: [
					{
						type: 'set',
						properties: {
							value: '={{ { "success": $response.body } }}', // Also possible to use the original response data
						},
					},
				]
			}
		},
		description: 'Name of the sender',
	},
];

export const attributeFields: INodeProperties[] = [
	...createAttributeOperations
];
