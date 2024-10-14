import type { INodeProperties } from 'n8n-workflow';

export const stateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['state'],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a state',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a state for a specific entity',
				action: 'Get a state',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many states',
				action: 'Get many states',
			},
		],
		default: 'get',
	},
];

export const stateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                state:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Entity Name or ID',
		name: 'entityId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getAllEntities',
		},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['state'],
			},
		},
		required: true,
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                state:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['state'],
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
				operation: ['getAll'],
				resource: ['state'],
				returnAll: [false],
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
	/*                                state:upsert                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Entity Name or ID',
		name: 'entityId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getAllEntities',
		},
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['state'],
			},
		},
		required: true,
		default: '',
		description:
			'The entity ID for which a state will be created. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['state'],
				operation: ['upsert'],
			},
		},
	},
	{
		displayName: 'State Attributes',
		name: 'stateAttributes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Attribute',
		default: {},
		displayOptions: {
			show: {
				resource: ['state'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the attribute',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute',
					},
				],
			},
		],
	},
];
