import { GenericValue, IDataObject, IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';


export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
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
						url: '/v3/contacts',
					},
				}
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
				routing: {
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contacts',
								},
							},
						],
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
	},
];

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'email',
			}
		}
	},
	{
		displayName: 'SMS',
		name: 'sms',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'sms',
			}
		}
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
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributesUi',
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
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'options',
								typeOptions: {
									loadOptions: {
										routing: {
											request: {
												method: 'GET',
												url: '/v3/contacts/attributes',
											},
											output: {
												postReceive: [
													{
														type: 'rootProperty',
														properties: {
															property: 'attributes',
														},
													},
													{
														type: 'setKeyValue',
														properties: {
															name: '={{$responseItem.name}} - ({{$responseItem.category}})',
															value: '={{$responseItem.name}}',
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
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
							},
						],
					},
				],
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
		],
	}
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		routing: {
			request: {
				method: 'GET',
				url: '={{$credentials.domain}}/v3/contacts?limit={{$parameter.limit}}&sort=desc',
			},
			send: {
				paginate: false,
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'contact',
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
			maxValue: 500,
		},
		default: 10,
		routing: {
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
		description: 'Max number of results to return',
	}
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				]
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '={{$credentials.domain}}/v3/contacts',
			},
			send: {
				preSend: [
					async function(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
						requestOptions.url = (requestOptions.url || '') as string;
						// if something special is required it is possible to write custom code and get from parameter
						requestOptions.url = `${requestOptions.url}/${encodeURIComponent(this.getNodeParameter('identifier') as string)}`;
						return requestOptions;
					},
				],
			},
			output: {
				postReceive: [
					{
						type: 'set',
						properties: {
							value: '={{ { "contacts": $response.body } }}', // Also possible to use the original response data
						},
					},
				],
			},
		},
		default: '',
		description: 'Email (urlencoded) OR ID of the contact OR its SMS attribute value',
	}
];

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				]
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '={{$credentials.domain}}/v3/contacts',
			},
			send: {
				preSend: [
					async function(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
						requestOptions.url = (requestOptions.url || '') as string;
						// if something special is required it is possible to write custom code and get from parameter
						requestOptions.url = `${requestOptions.url}/${encodeURIComponent(this.getNodeParameter('identifier') as string)}`;
						return requestOptions;
					},
				],
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
		default: '',
		description: 'Email (urlencoded) OR ID of the contact OR its SMS attribute value',
	}
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	...createOperations,
	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
	/* -------------------------------------------------------------------------- */
	...getAllOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	...getOperations,

	/* -------------------------------------------------------------------------- */
	/*                                contact:delete                              */
	/* -------------------------------------------------------------------------- */
	...deleteOperations,
];
