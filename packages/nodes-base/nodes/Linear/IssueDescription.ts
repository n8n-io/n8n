import type { INodeProperties } from 'n8n-workflow';

export const issueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['issue'],
			},
		},
		options: [
			{
				name: 'Add Link',
				value: 'addLink',
				description: 'Add a link to an issue',
				action: 'Add a link to an issue',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue',
				action: 'Create an issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
				action: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
				action: 'Get an issue',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many issues',
				action: 'Get many issues',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
				action: 'Update an issue',
			},
		],
		default: 'create',
	},
];

export const issueFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 issue:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
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
				resource: ['issue'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assignee Name or ID',
				name: 'assigneeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priorityId',
				type: 'options',
				options: [
					{
						name: 'Urgent',
						value: 1,
					},
					{
						name: 'High',
						value: 2,
					},
					{
						name: 'Normal',
						value: 3,
					},
					{
						name: 'Low',
						value: 4,
					},
					{
						name: 'No Priority',
						value: 0,
					},
				],
				default: 0,
			},
			{
				displayName: 'State Name or ID',
				name: 'stateId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getStates',
				},
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 issue:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['addLink', 'get', 'delete'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 issue:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 issue:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issue'],
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
				resource: ['issue'],
				operation: ['update'],
				'@version': [1],
			},
		},
		options: [
			{
				displayName: 'Assignee Name or ID',
				name: 'assigneeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority Name/ID',
				name: 'priorityId',
				type: 'options',
				options: [
					{
						name: 'Urgent',
						value: 1,
					},
					{
						name: 'High',
						value: 2,
					},
					{
						name: 'Medium',
						value: 3,
					},
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'No Priority',
						value: 0,
					},
				],
				default: 0,
			},
			{
				displayName: 'State Name or ID',
				name: 'stateId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getStates',
				},
				default: '',
			},
			{
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['update'],
			},
			hide: {
				'@version': [1],
			},
		},
		options: [
			{
				displayName: 'Assignee Name or ID',
				name: 'assigneeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority Name/ID',
				name: 'priorityId',
				type: 'options',
				options: [
					{
						name: 'Urgent',
						value: 1,
					},
					{
						name: 'High',
						value: 2,
					},
					{
						name: 'Medium',
						value: 3,
					},
					{
						name: 'Low',
						value: 4,
					},
					{
						name: 'No Priority',
						value: 0,
					},
				],
				default: 0,
			},
			{
				displayName: 'State Name or ID',
				name: 'stateId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getStates',
				},
				default: '',
			},
			{
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                         	issue:addLink                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Link',
		name: 'link',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['addLink'],
			},
		},
		default: '',
	},
];
