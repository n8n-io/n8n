import { INodeProperties } from 'n8n-workflow';

export const agentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent by ID',
				action: 'Delete an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an agent by ID',
				action: 'Get an agent',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: "Get all agents of the current user's organization",
				action: 'Get many agents',
			},
			{
				name: 'Get Output',
				value: 'getOutput',
				description: 'Get the output of the most recent container of an agent',
				action: 'Get the output of an agent',
			},
			{
				name: 'Launch',
				value: 'launch',
				description: 'Add an agent to the launch queue',
				action: 'Add an agent to the launch queue',
			},
		],
		default: 'launch',
	},
];

export const agentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 agent:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent Name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getAgents',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['agent'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 agent:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['agent'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 agent:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['agent'],
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
				resource: ['agent'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 25,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 agent:getOutput                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent Name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getAgents',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['getOutput'],
				resource: ['agent'],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['getOutput'],
				resource: ['agent'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the outpout is presented as string. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getOutput'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Prev Container ID',
				name: 'prevContainerId',
				type: 'string',
				default: '',
				description:
					'If set, the output will be retrieved from the container after the specified previous container ID',
			},
			{
				displayName: 'Prev Status',
				name: 'prevStatus',
				type: 'options',
				options: [
					{
						name: 'Finished',
						value: 'finished',
					},
					{
						name: 'Launch Error',
						value: 'lauch error',
					},
					{
						name: 'Never Launched',
						value: 'never launched',
					},
					{
						name: 'Running',
						value: 'running',
					},
					{
						name: 'Starting',
						value: 'starting',
					},
					{
						name: 'Unknown',
						value: 'unknown',
					},
				],
				default: '',
				description: 'If set, allows to define which status was previously retrieved on user-side',
			},
			{
				displayName: 'Pre Runtime Event Index',
				name: 'prevRuntimeEventIndex',
				type: 'number',
				default: 0,
				description:
					"If set, the container's runtime events will be returned in the response starting from the provided previous runtime event index",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 agent:launch                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent Name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getAgents',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['launch'],
				resource: ['agent'],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['launch'],
				resource: ['agent'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the launch just include the container ID. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['launch'],
				resource: ['agent'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['launch'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Arguments (JSON)',
				name: 'argumentsJson',
				type: 'json',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				default: '',
				description:
					'Agent argument. Can either be a JSON string or a plain object. The argument can be retrieved with buster.argument in the agent’s script.',
			},
			{
				displayName: 'Arguments',
				name: 'argumentsUi',
				placeholder: 'Add Argument',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/jsonParameters': [false],
					},
				},
				options: [
					{
						name: 'argumentValues',
						displayName: 'Argument',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the argument key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the argument key',
							},
						],
					},
				],
			},
			{
				displayName: 'Bonus Argument',
				name: 'bonusArgumentUi',
				placeholder: 'Add Bonus Argument',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/jsonParameters': [false],
					},
				},
				options: [
					{
						name: 'bonusArgumentValue',
						displayName: 'Bonus Argument',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the argument key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the argument key',
							},
						],
					},
				],
			},
			{
				displayName: 'Bonus Argument (JSON)',
				name: 'bonusArgumentJson',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				default: '',
				description:
					'Agent bonus argument. Can either be a JSON string or a plain object. This bonus argument is single-use, it will only be used for the current launch. If present, it will be merged with the original argument, resulting in an effective argument that can be retrieved with buster.argument in the agent’s script.',
			},
			{
				displayName: 'Manual Launch',
				name: 'manualLaunch',
				type: 'boolean',
				default: false,
				description: 'Whether the agent will be considered as "launched manually"',
			},
			{
				displayName: 'Max Instance Count',
				name: 'maxInstanceCount',
				type: 'number',
				default: 0,
				description:
					'If set, the agent will only be launched if the number of already running instances is below the specified number',
			},
			{
				displayName: 'Save Argument',
				name: 'saveArgument',
				type: 'string',
				default: '',
				description: 'If true, argument will be saved as the default launch options for the agent',
			},
		],
	},
];
