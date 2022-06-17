import {
	INodeProperties
} from 'n8n-workflow';

export const opportunityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
						url: '=/pipelines/{{$parameter.pipelineIdentifier}}/opportunities',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'opportunity',
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
						url: '=/pipelines/{{$parameter.pipelineIdentifier}}/opportunities/{{$parameter.identifier}}',
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
						url: '=/pipelines/{{$parameter.pipelineIdentifier}}/opportunities/{{$parameter.identifier}}',
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/pipelines/{{$parameter.pipelineIdentifier}}/opportunities',
					},
					send: {
						paginate: true,
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'opportunities',
								},
							},
						],
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/pipelines/{{$parameter.pipelineIdentifier}}/opportunities/{{$parameter.identifier}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'opportunity',
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
					'opportunity',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Monetary Value',
				name: 'monetaryValue',
				type: 'number',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'monetaryValue',
					}
				}
			},
			{
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
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
			// TODO: TAGS as Array
			// {
			// 	displayName: 'Tags',
			// 	name: 'tags',
			// 	type: 'string',
			// 	default: '',
			// 	routing: {
			// 		send: {
			// 			type: 'body',
			// 			property: 'tags',
			// 		}
			// 	}
			// },
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'companyName',
					}
				}
			},
		],
	}
]

const createOperations: Array<INodeProperties> = [
	{
		displayName: 'Pipeline Identifier',
		name: 'pipelineIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Pipeline the opportunity belongs to',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
				property: 'title',
			}
		}
	},
	{
		displayName: 'Stage ID',
		name: 'stageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
				property: 'stageId',
			}
		}
	},
	{
		displayName: 'Contact ID',
		name: 'contactId ',
		type: 'string',
		description: 'Contact ID (or email or phone) required',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
				property: 'contactId',
			}
		}
	},
	{
		displayName: 'Email',
		name: 'email  ',
		type: 'string',
		description: 'Email (or contactId or phone) required',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
				property: 'email ',
			}
		}
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		description: 'Phone (or contactId or email) required',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Pipeline Identifier',
		name: 'pipelineIdentifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'Pipeline the opportunity belongs to',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'delete',
				]
			},
		},
		default: '',
		description: 'Opportunity ID',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Pipeline Identifier',
		name: 'pipelineIdentifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		required: true,
		description: 'Pipeline the opportunity belongs to',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
		description: 'Opportunity ID',
	},
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Pipeline Identifier',
		name: 'pipelineIdentifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		required: true,
		description: 'Pipeline the opportunity belongs to',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'opportunity',
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
					'opportunity',
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
					'opportunity',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Stage ID',
				name: 'stageId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'stageId',
					}
				}
			},
			{
				displayName: 'Monetary Value',
				name: 'monetaryValue',
				type: 'number',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'monetaryValue',
					}
				}
			},
			{
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'assignedTo',
					}
				}
			},
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'campaignId',
					}
				}
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'number',
				default: '',
				description: 'Epoch timestamp. for ex: 1598107050459.',
				routing: {
					send: {
						type: 'query',
						property: 'startDate',
					}
				}
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'number',
				default: '',
				description: 'Epoch timestamp. for ex: 1614091050459.',
				routing: {
					send: {
						type: 'query',
						property: 'endDate',
					}
				}
			},
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
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Won',
						value: 'won',
					},
					{
						name: 'Lost',
						value: 'lost',
					},
					{
						name: 'Abandoned',
						value: 'abandoned',
					},
				],
				default: 'open',
				routing: {
					send: {
						type: 'query',
						property: 'status',
					}
				}
			},
		],
	},
];

export const opportunityFields: INodeProperties[] = [
	...createOperations,
	// ...updateOperations,
	...additionalFields,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
];
