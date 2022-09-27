import { INodeProperties } from 'n8n-workflow';
import {
	getCursorPaginator,
	parseAndSetBodyJson,
	prepareWorkflowCreateBody,
	prepareWorkflowUpdateBody,
} from './GenericFunctions';
import { workflowIdLocator } from './WorkflowLocator';

export const workflowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['workflow'],
			},
		},
		options: [
			{
				name: 'Activate',
				value: 'activate',
				action: 'Activate a workflow',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a workflow',
				routing: {
					request: {
						method: 'POST',
						url: '/workflows',
					},
				},
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				action: 'Deactivate a workflow',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a workflow',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a workflow',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many workflows',
				routing: {
					request: {
						method: 'GET',
						url: '/workflows',
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
				name: 'Update',
				value: 'update',
				action: 'Update a workflow',
			},
		],
	},
];

const activateOperation: INodeProperties[] = [
	{
		...workflowIdLocator,
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['activate'],
			},
		},
		// The routing for resourceLocator-enabled properties currently needs to
		// happen in the property block where the property itself is defined, or
		// extractValue won't work when used with $parameter in routing.request.url.
		routing: {
			request: {
				method: 'POST',
				url: '=/workflows/{{ $value }}/activate',
			},
		},
	},
];

const createOperation: INodeProperties[] = [
	{
		displayName: 'Workflow Object',
		name: 'workflowObject',
		type: 'json',
		default: '{ "name": "My workflow", "nodes": [], "connections": {}, "settings": {} }',
		placeholder:
			'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				preSend: [parseAndSetBodyJson('workflowObject'), prepareWorkflowCreateBody],
			},
		},
		description:
			"A valid JSON object with required fields: 'name', 'nodes', 'connections' and 'settings'. More information can be found in the <a href=\"https://docs.n8n.io/api/api-reference/#tag/Workflow/paths/~1workflows/post\">documentation</a>.",
	},
];

const deactivateOperation: INodeProperties[] = [
	{
		...workflowIdLocator,
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['deactivate'],
			},
		},
		routing: {
			request: {
				method: 'POST',
				url: '=/workflows/{{ $value }}/deactivate',
			},
		},
	},
];

const deleteOperation: INodeProperties[] = [
	{
		...workflowIdLocator,
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['delete'],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/workflows/{{ $value }}',
			},
		},
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
				resource: ['workflow'],
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
				resource: ['workflow'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Return Only Active Workflows',
				name: 'activeWorkflows',
				type: 'boolean',
				default: true,
				routing: {
					request: {
						qs: {
							active: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				routing: {
					// Only include the 'tags' query parameter if it's non-empty
					send: {
						type: 'query',
						property: 'tags',
						value: '={{ $value !== "" ? $value : undefined }}',
					},
				},
				description: 'Include only workflows with these tags',
				hint: 'Comma separated list of tags (empty value is ignored)',
			},
		],
	},
];

const getOperation: INodeProperties[] = [
	{
		...workflowIdLocator,
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['get'],
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '=/workflows/{{ $value }}',
			},
		},
	},
];

const updateOperation: INodeProperties[] = [
	{
		...workflowIdLocator,
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['update'],
			},
		},
		routing: {
			request: {
				method: 'PUT',
				url: '=/workflows/{{ $value }}',
			},
		},
	},
	{
		displayName: 'Workflow Object',
		name: 'workflowObject',
		type: 'json',
		default: '',
		placeholder:
			'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['update'],
			},
		},
		routing: {
			send: {
				preSend: [parseAndSetBodyJson('workflowObject'), prepareWorkflowUpdateBody],
			},
		},
		description:
			"A valid JSON object with required fields: 'name', 'nodes', 'connections' and 'settings'. More information can be found in the <a href=\"https://docs.n8n.io/api/api-reference/#tag/Workflow/paths/~1workflows~1%7Bid%7D/put\">documentation</a>.",
	},
];

export const workflowFields: INodeProperties[] = [
	...activateOperation,
	...createOperation,
	...deactivateOperation,
	...deleteOperation,
	...getAllOperation,
	...getOperation,
	...updateOperation,
];
