import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties
} from 'n8n-workflow';

import { isEmailValid, isPhoneValid } from '../GenericFunctions';

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
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities/{{$parameter.opportunityId}}',
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
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities/{{$parameter.opportunityId}}',
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities',
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
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities/{{$parameter.opportunityId}}',
					},
				},
			},
		],
		default: 'create',
	},
];

const pipelineId: INodeProperties =
{
	displayName: 'Pipeline ID',
	name: 'pipelineId',
	type: 'options',
	displayOptions: {
		show: {
			resource: [
				'opportunity',
			],
			operation: [
				'create',
				'delete',
				'get',
				'getAll',
				'update',
			],
		},
	},
	typeOptions: {
		loadOptions: {
			routing: {
				request: {
					url: '/pipelines',
					method: 'GET',
				},
				output: {
					postReceive: [
						{
							type: 'rootProperty',
							properties: {
								property: 'pipelines',
							},
						},
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.name}}',
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
		}
	},
	default: '',
	description: 'Pipeline the opportunity belongs to',
}

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
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Stage ID',
		name: 'stageId',
		type: 'options',
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
		typeOptions: {
			loadOptionsDependsOn: ['pipelineId'],
			loadOptionsMethod: 'getPipelineStages'
		},
		routing: {
			send: {
				type: 'body',
				property: 'stageId',
			}
		}
	},
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
		required: true,
		type: 'string',
		description: 'Either Email, Phone or Contact ID',
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
				preSend: [
					async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
						requestOptions.body = (requestOptions.body || {}) as object;
						const identifier = this.getNodeParameter('contactIdentifier') as string;
						if (isEmailValid(identifier)) {
							Object.assign(requestOptions.body, { email: identifier });
						} else if (isPhoneValid(identifier)) {
							Object.assign(requestOptions.body, { phone: identifier })
						} else {
							Object.assign(requestOptions.body, { contactId: identifier });
						}
						return requestOptions;
					},
				],
			}
		}
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
		displayName: 'Status',
		name: 'status',
		type: 'options',
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
				type: 'body',
				property: 'status',
			}
		}
	},
];

const deleteOperations: Array<INodeProperties> = [
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
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
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
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

const updateOperations: Array<INodeProperties> = [
	// {
	// 	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	// 	displayName: 'Stage ID',
	// 	name: 'stageId',
	// 	type: 'options',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'opportunity',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	typeOptions: {
	// 		loadOptionsDependsOn: ['pipelineId'],
	// 		loadOptionsMethod: 'getPipelineStages'
	// 	},
	// 	routing: {
	// 		send: {
	// 			type: 'body',
	// 			property: 'stageId',
	// 		}
	// 	}
	// },
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'update',
				]
			},
		},
		default: '',
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
					'update',
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
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'opportunity',
				],
				operation: [
					'update',
				],
			},
		},
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
				type: 'body',
				property: 'status',
			}
		}
	},
];

export const opportunityFields: INodeProperties[] = [
	pipelineId,
	...createOperations,
	...updateOperations,
	...additionalFields,
	...deleteOperations,
	...getOperations,
	...getAllOperations,
];
