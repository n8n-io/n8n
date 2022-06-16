import { INodeProperties } from 'n8n-workflow';

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
				},
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
					request: {
						method: 'GET',
						url: '/v3/contacts',
					},
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
					operations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit',
								offsetParameter: 'offset',
								pageSize: 1000,
								type: 'query',
							},
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
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
		],
		default: 'create',
	},
];

const createOperations: INodeProperties[] = [
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
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'createAdditionalFields',
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
				displayName: 'Contact Attributes',
				name: 'createContactAttributes',
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
								routing: {
									send: {
										value: '={{$value}}',
										property: '=attributes.{{$parent.fieldName}}',
										type: 'body',
									},
								},
							},
						],
					},
				],
				default: {},
				description: 'Array of attributes to be added',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
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
		default: {},
		options: [
			{
				displayName: 'Update Enabled',
				name: 'updateEnabled',
				type: 'boolean',
				default: false,
				routing: {
					send: {
						type: 'body',
						property: 'updateEnabled',
					},
				},
			},
		],
	},
];

const getAllOperations: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		routing: {
			send: {
				paginate: '={{$value}}',
			},
		},
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
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
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
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{name:'DESC', value: 'desc'},
					{name:'ASC', value: 'asc'},
				],
				routing: {
					send: {
						type: 'query',
						property: 'sort',
						value: '={{$value}}',
					},
				},
				default: 'desc',
				description: 'Sort the results in the ascending/descending order of record creation',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
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
		default: {},
		options: [
			{
				displayName: 'Modified Since',
				name: 'modifiedSince',
				type: 'dateTime',
				routing: {
					send: {
						type: 'query',
						property: 'modifiedSince',
					},
				},
				default: '',
				description: 'Filter (urlencoded) the contacts modified after a given UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ)',
			},
		],
	},
];

const getOperations: INodeProperties[] = [
	{
		displayName: 'Contact Identifier',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '=/v3/contacts/{{$value}}',
			},
		},
		required: true,
		default: '',
		description: 'Email (urlencoded) OR ID of the contact OR its SMS attribute value',
	},
];

const deleteOperations: INodeProperties[] = [
	{
		displayName: 'Contact Identifier',
		name: 'identifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/v3/contacts/{{encodeURIComponent($parameter.identifier)}}',
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
	},
];

const updateOperations: INodeProperties[] = [
	{
		default: '',
		description: 'Email (urlencoded) OR ID of the contact OR its SMS attribute value',
		displayName: 'Contact Identifier',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		name: 'identifier',
		type: 'string',
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'updateAttributes',
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
								routing: {
									send: {
										value: '={{$value}}',
										property: '=attributes.{{$parent.fieldName}}',
										type: 'body',
									},
								},
							},
						],
					},
				],
				default: {},
				description: 'Array of attributes to be updated',
			},
		],
		routing: {
			request: {
				method: 'PUT',
				url: '=/v3/contacts/{{$parameter.identifier}}',
			},
		},
	},
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

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                              */
	/* -------------------------------------------------------------------------- */
	...updateOperations,
];
