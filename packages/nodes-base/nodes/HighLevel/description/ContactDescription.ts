import {
	INodeProperties
} from 'n8n-workflow';

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
						url: '/contacts',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
								},
							},
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contacts/{{$parameter.identifier}}',
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
						url: '=/contacts/{{$parameter.identifier}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
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
						url: '=/contacts',
					},
					send: {
						paginate: true,
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
				}
			},
			{
				name: 'Lookup',
				value: 'lookup',
				routing: {
					request: {
						method: 'GET',
						url: '=/contacts/lookup?email={{$parameter.email}}&phone={{$parameter.phone}}',
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
				},
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/contacts/{{$parameter.identifier}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'contact',
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

const additionalFields: Array<INodeProperties> = [
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
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'firstName',
					}
				}
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'lastName',
					}
				}
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					}
				}
			},
			{
				displayName: 'Address 1',
				name: 'address1',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'address1',
					}
				}
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'city',
					}
				}
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'state',
					}
				}
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'postalCode',
					}
				}
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'website',
					}
				}
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'timezone',
					}
				}
			},
			// {
			// 	displayName: 'DND',
			// 	name: 'dnd',
			// 	type: 'boolean',
			// 	default: false,
			// 	routing: {
			// 		send: {
			// 			type: 'body',
			// 			property: 'dnd',
			// 		}
			// 	}
			// },
			// {
			// 	displayName: 'Tags',
			// 	name: 'tags',
			// 	type: 'string',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 		multipleValueButtonText: 'Add Tag',
			// 	},
			// 	default: [],
			// 	routing: {
			// 		send: {
			// 			type: 'body',
			// 			property: 'tags',
			// 		}
			// 	},
			// },
		],
	}
]

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		description: 'Email or Phone are required to create contact',
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
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description: 'Email or Phone are required to create contact',
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
				property: 'phone',
			}
		}
	},
];

const updateOperations: Array<INodeProperties> = [
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				]
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		description: 'Update Email of Contact',
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
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'email',
			}
		}
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description: 'Update Phone of Contact',
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
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'phone',
			}
		}
	},
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
		default: '',
		description: 'Contact ID',
	}
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
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
		default: '',
		description: 'Contact ID',
	},
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
			maxValue: 100,
		},
		default: 20,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
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
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Query will search on these fields: Name, Phone, Email, Tags, and Company Name',
				routing: {
					send: {
						type: 'query',
						property: 'query',
					}
				}
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
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
		options: [
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Date Added',
						value: 'date_added',
					},
					{
						name: 'Date Updated',
						value: 'date_updated',
					},
				],
				default: 'date_added',
				routing: {
					send: {
						type: 'query',
						property: 'sortBy',
					}
				}
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Descending',
						value: 'desc',
					},
					{
						name: 'Ascending',
						value: 'asc',
					},
				],
				default: 'desc',
				routing: {
					send: {
						type: 'query',
						property: 'order',
					}
				}
			},
		],
	},
];

const lookupOperations: Array<INodeProperties> = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		description: 'Lookup Contact by Email and/or Phone',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'lookup',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description: 'Lookup Contact by Phone and/or Email',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'lookup',
				],
			},
		},
		default: '',
	},
];


export const contactFields: INodeProperties[] = [
	...createOperations,
	...updateOperations,
	...additionalFields,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
	...lookupOperations,
];
