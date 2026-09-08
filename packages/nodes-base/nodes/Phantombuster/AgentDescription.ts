import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Get many',
				value: 'getAll',
				description: "Get many agents of the current user's organization",
				action: 'Get many agents',
			},
			{
				name: 'Get output',
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
			{
				name: 'Launch sync',
				value: 'launchSync',
				description: 'Launch an agent and stream results',
				action: 'Launch an agent and stream results',
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
		displayName: 'Agent name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Return all',
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
		displayName: 'Agent name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Resolve data',
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
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getOutput'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Prev container ID',
				name: 'prevContainerId',
				type: 'string',
				default: '',
				description:
					'If set, the output will be retrieved from the container after the specified previous container ID',
			},
			{
				displayName: 'Prev status',
				name: 'prevStatus',
				type: 'options',
				options: [
					{
						name: 'Finished',
						value: 'finished',
					},
					{
						name: 'Launch error',
						value: 'lauch error',
					},
					{
						name: 'Never launched',
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
				displayName: 'Pre runtime event index',
				name: 'prevRuntimeEventIndex',
				type: 'number',
				default: 0,
				description:
					"If set, the container's runtime events will be returned in the response starting from the provided previous runtime event index",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 agent:launch / launchSync                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent name or ID',
		name: 'agentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getAgents',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['launch', 'launchSync'],
				resource: ['agent'],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve data',
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
		displayName: 'JSON parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['launch', 'launchSync'],
				resource: ['agent'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['launch', 'launchSync'],
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
				placeholder: 'Add argument',
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
				displayName: 'Bonus argument',
				name: 'bonusArgumentUi',
				placeholder: 'Add bonus argument',
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
						displayName: 'Bonus argument',
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
				displayName: 'Bonus argument (JSON)',
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
				displayName: 'Manual launch',
				name: 'manualLaunch',
				type: 'boolean',
				default: false,
				description: 'Whether the agent will be considered as "launched manually"',
			},
			{
				displayName: 'Max instance count',
				name: 'maxInstanceCount',
				type: 'number',
				default: 0,
				description:
					'If set, the agent will only be launched if the number of already running instances is below the specified number',
			},
			{
				displayName: 'Save argument',
				name: 'saveArgument',
				type: 'string',
				default: '',
				description: 'If true, argument will be saved as the default launch options for the agent',
			},
		],
	},
];
