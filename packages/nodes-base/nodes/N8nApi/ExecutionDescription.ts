import { getCursorPaginator } from './GenericFunctions';
import { INodeProperties } from 'n8n-workflow';

export const executionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an execution',
				routing: {
					request: {
						method: 'GET',
						url: '=/executions/{{ $parameter.executionId }}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many executions',
				routing: {
					request: {
						method: 'GET',
						url: '/executions',
					},
					send: {
						paginate: true,
					},
					operations: {
						pagination: getCursorPaginator(),
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an execution',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/executions/{{ $parameter.executionId }}',
					},
				},
			},
		],
	},
];

const deleteOperation: INodeProperties[] = [
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'ID of the execution to delete',
	},
];

const getAllOperation: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			request: {
				qs: {
					limit: '={{ $value }}',
				},
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Include Data',
		name: 'activeWorkflows',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getAll'],
			},
		},
		routing: {
			request: {
				qs: {
					includeData: '={{ $value }}',
				},
			},
		},
		description: 'Whether to include the detailed execution data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'workflowId',
						value: '={{ $value !== "" ? $value : undefined }}',
					},
				},
				description: 'Workflow ID to filter the executions by',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Error',
						value: 'error',
					},
					{
						name: 'Success',
						value: 'success',
					},
					{
						name: 'Waiting',
						value: 'waiting',
					},
				],
				default: 'success',
				routing: {
					send: {
						type: 'query',
						property: 'status',
						value: '={{ $value }}',
					},
				},
				description: 'Status to filter the executions by',
			},
		],
	},
];

const getOperation: INodeProperties[] = [
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'string',
		required: true,
		default: '1',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['get'],
			},
		},
		description: 'ID of the execution to get',
	},
	{
		displayName: 'Include Data',
		name: 'activeWorkflows',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['get'],
			},
		},
		routing: {
			request: {
				qs: {
					includeData: '={{ $value }}',
				},
			},
		},
		description: 'Whether to include the detailed execution data',
	},
];

export const executionFields: INodeProperties[] = [
	...deleteOperation,
	...getAllOperation,
	...getOperation,
];
