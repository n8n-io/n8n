import { INodeProperties } from 'n8n-workflow';

export const userSettingsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'userSettings',
				],
			},
		},
		options: [
			{
				name: 'Update Flag Settings for User',
				value: 'updateFlagSettingsForUser',
				description: 'Enable or disable a feature flag for a user based on their key',
				action: 'Update Flag Settings for User an user settings',
			},
		],
		default: '',
	},
];

export const userSettingsFields: INodeProperties[] = [
	{
		displayName: 'Project Key Name or ID',
		name: 'projectKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Environment Key Name or ID',
		name: 'environmentKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: [
				'projectKey',
			],
			loadOptionsMethod: 'getEnvironments',
		},
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'User Key',
		name: 'userKey',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Feature Flag Key Name or ID',
		name: 'featureFlagKey',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: [
				'projectKey',
			],
			loadOptionsMethod: 'getFeatureFlags',
		},
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Setting Name or ID',
		name: 'setting',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'featureFlagKey',
			],
			loadOptionsMethod: 'getVariationsByFlag',
		},
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		required: true,
		description: 'The variation value to set for the user. Must match the flag\'s variation type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'updateFlagSettingsForUser',
				],
				resource: [
					'userSettings',
				],
			},
		},
		default: '',
		description: 'Optional comment describing the change',
	},
];
