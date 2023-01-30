import { INodeProperties } from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a project',
				action: 'Get a project',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many projects',
				action: 'Get many projects',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new project',
				action: 'Create a project',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing project',
				action: 'Update a project',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
				action: 'Delete a project',
			},
		],
		default: 'create',
	},
];

export const projectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  project:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource.',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Invoices',
				value: 'invoices',
			},
			{
				name: 'Clients',
				value: 'clients',
			},
		],
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  project:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'filter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Project Number',
				name: 'number',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource.',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['getAll'],
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Invoices',
				value: 'invoices',
			},
			{
				name: 'Clients',
				value: 'clients',
			},
		],
		default: [],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['getAll'],
				resource: ['project'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given perPage',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['getAll'],
			},
			hide: {
				returnAll: [true],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Project Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Project Number',
				name: 'number',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
            {
				displayName: 'User (Origin)',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
            {
				displayName: 'User (Assigned)',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Task Rate',
				name: 'taskRate',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['update'],
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
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['update'],
			},
		},
		options: [
			
			{
				displayName: 'Project Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Project Number',
				name: 'number',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Client',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
            {
				displayName: 'User (Origin)',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
            {
				displayName: 'User (Assigned)',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Task Rate',
				name: 'taskRate',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['project'],
				operation: ['delete'],
			},
		},
	},
];
