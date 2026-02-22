import type { INodeProperties } from 'n8n-workflow';

export const conversationFlowComponentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a flow component',
				action: 'Create a flow component',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a flow component',
				action: 'Delete a flow component',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a flow component by ID',
				action: 'Get a flow component',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many flow components',
				action: 'Get many flow components',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a flow component',
				action: 'Update a flow component',
			},
		],
		default: 'create',
	},
];

export const conversationFlowComponentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                    conversationFlowComponent:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the flow component',
	},
	{
		displayName: 'Nodes',
		name: 'nodes',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['create'],
			},
		},
		default: '[]',
		description:
			'JSON array of conversation flow nodes defining the component structure',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Start Node ID',
				name: 'startNodeId',
				type: 'string',
				default: '',
				description: 'The ID of the initial node in the component',
			},
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available within the component',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                     conversationFlowComponent:get                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Component ID',
		name: 'componentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The unique ID of the flow component to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                   conversationFlowComponent:getMany                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['getMany'],
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
				resource: ['conversationFlowComponent'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                   conversationFlowComponent:update                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Component ID',
		name: 'componentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The unique ID of the flow component to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the flow component',
			},
			{
				displayName: 'Nodes',
				name: 'nodes',
				type: 'json',
				default: '[]',
				description:
					'JSON array of conversation flow nodes defining the component structure',
			},
			{
				displayName: 'Start Node ID',
				name: 'startNodeId',
				type: 'string',
				default: '',
				description: 'The ID of the initial node in the component',
			},
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available within the component',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                   conversationFlowComponent:delete                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Component ID',
		name: 'componentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlowComponent'],
				operation: ['delete'],
			},
		},
		default: '',
		description:
			'The unique ID of the flow component to delete. Linked flows will receive local copies.',
	},
];
