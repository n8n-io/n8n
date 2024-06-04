import type { INodeProperties } from 'n8n-workflow';

import {
	contactIdentifierPreSendAction,
	dateTimeToEpochPreSendAction,
	opportunityUpdatePreSendAction,
	splitTagsPreSendAction,
} from '../GenericFunctions';

export const opportunityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				routing: {
					send: {
						preSend: [splitTagsPreSendAction],
					},
					request: {
						method: 'POST',
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities',
					},
				},
				action: 'Create an opportunity',
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
				action: 'Delete an opportunity',
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
				action: 'Get an opportunity',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities',
					},
					send: {
						paginate: true,
					},
				},
				action: 'Get many opportunities',
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'PUT',
						url: '=/pipelines/{{$parameter.pipelineId}}/opportunities/{{$parameter.opportunityId}}',
					},
					send: {
						preSend: [opportunityUpdatePreSendAction, splitTagsPreSendAction],
					},
				},
				action: 'Update an opportunity',
			},
		],
		default: 'create',
	},
];

const pipelineId: INodeProperties = {
	displayName: 'Pipeline Name or ID',
	name: 'pipelineId',
	type: 'options',
	displayOptions: {
		show: {
			resource: ['opportunity'],
			operation: ['create', 'delete', 'get', 'getAll', 'update'],
		},
	},
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		},
	},
	default: '',
};

const createProperties: INodeProperties[] = [
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
		default: '',
		typeOptions: {
			loadOptionsDependsOn: ['pipelineId'],
			loadOptionsMethod: 'getPipelineStages',
		},
		routing: {
			send: {
				type: 'body',
				property: 'stageId',
			},
		},
	},
	{
		displayName: 'Contact Identifier',
		name: 'contactIdentifier',
		required: true,
		type: 'string',
		description: 'Either Email, Phone or Contact ID',
		hint: 'There can only be one opportunity for each contact.',
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				preSend: [contactIdentifierPreSendAction],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'title',
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
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
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['create'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Choose staff member from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
					},
				},
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'companyName',
					},
				},
			},
			{
				displayName: 'Monetary Value',
				name: 'monetaryValue',
				type: 'number',
				default: '',
				description: 'Monetary value of lead opportunity',
				routing: {
					send: {
						type: 'body',
						property: 'monetaryValue',
					},
				},
			},

			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. John Deo',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				hint: 'Comma separated list of tags, array of strings can be set in expression',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},
		],
	},
];

const deleteProperties: INodeProperties[] = [
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['delete'],
			},
		},
		default: '',
	},
];

const getProperties: INodeProperties[] = [
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['get'],
			},
		},
		default: '',
	},
];

const getAllProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['opportunity'],
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
				resource: ['opportunity'],
				operation: ['getAll'],
				returnAll: [false],
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
				resource: ['opportunity'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Choose staff member from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				routing: {
					send: {
						type: 'query',
						property: 'assignedTo',
					},
				},
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
					},
				},
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'endDate',
						preSend: [dateTimeToEpochPreSendAction],
					},
				},
			},
			// api should filter by monetary value but doesn't
			// {
			// 	displayName: 'Monetary Value',
			// 	name: 'monetaryValue',
			// 	type: 'number',
			// 	default: '',
			// 	routing: {
			// 		send: {
			// 			type: 'query',
			// 			property: 'monetaryValue',
			// 		},
			// 	},
			// },
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['pipelineId'],
					loadOptionsMethod: 'getPipelineStages',
				},
				routing: {
					send: {
						type: 'query',
						property: 'stageId',
					},
				},
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'startDate',
						preSend: [dateTimeToEpochPreSendAction],
					},
				},
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
					},
				},
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Query will search on these fields: Name, Phone, Email, Tags, and Company Name',
				routing: {
					send: {
						type: 'query',
						property: 'query',
					},
				},
			},
		],
	},
];

const updateProperties: INodeProperties[] = [
	{
		displayName: 'Opportunity ID',
		name: 'opportunityId',
		type: 'string',
		required: true,
		hint: "You cannot update an opportunity's pipeline ID.",
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['opportunity'],
				operation: ['update'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Choose staff member from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				routing: {
					send: {
						type: 'body',
						property: 'assignedTo',
					},
				},
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'companyName',
					},
				},
			},
			{
				displayName: 'Contact Identifier',
				name: 'contactIdentifier',
				type: 'string',
				description: 'Either Email, Phone or Contact ID',
				hint: 'There can only be one opportunity for each contact.',
				default: '',
				routing: {
					send: {
						preSend: [contactIdentifierPreSendAction],
					},
				},
			},
			{
				displayName: 'Monetary Value',
				name: 'monetaryValue',
				type: 'number',
				default: '',
				description: 'Monetary value of lead opportunity',
				routing: {
					send: {
						type: 'body',
						property: 'monetaryValue',
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. John Deo',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['pipelineId'],
					loadOptionsMethod: 'getPipelineStages',
				},
				routing: {
					send: {
						type: 'body',
						property: 'stageId',
					},
				},
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
						type: 'body',
						property: 'status',
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				hint: 'Comma separated list of tags, array of strings can be set in expression',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},
		],
	},
];

export const opportunityFields: INodeProperties[] = [
	pipelineId,
	...createProperties,
	...updateProperties,
	...deleteProperties,
	...getProperties,
	...getAllProperties,
];
