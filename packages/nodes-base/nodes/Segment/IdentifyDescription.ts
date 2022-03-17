import {
	INodeProperties,
} from 'n8n-workflow';

export const identifyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'identify',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an identity',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const identifyFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                identify:create                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'identify',
				],
				operation: [
					'create',
				],
			},
		},
		required: false,
	},
	{
		displayName: 'Traits',
		name: 'traits',
		placeholder: 'Add Trait',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'identify',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'traitsUi',
				displayName: 'Trait',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Context',
		name: 'context',
		placeholder: 'Add Context',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'identify',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'contextUi',
				displayName: 'Context',
				values: [
					{
						displayName: 'Active',
						name: 'active',
						type: 'boolean',
						default: '',
						description: 'Whether a user is active',
					},
					{
						displayName: 'IP',
						name: 'ip',
						type: 'string',
						default: '',
						description: 'Current user’s IP address.',
					},
					{
						displayName: 'Locale',
						name: 'locate',
						type: 'string',
						default: '',
						description: 'Locale string for the current user, for example en-US.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'string',
						default: '',
						description: 'Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and url',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						description: 'Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York',
					},
					{
						displayName: 'App',
						name: 'app',
						placeholder: 'Add App',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'appUi',
								displayName: 'App',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Version',
										name: 'version',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Build',
										name: 'build',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Campaign',
						name: 'campaign',
						placeholder: 'Campaign App',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'campaignUi',
								displayName: 'Campaign',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Source',
										name: 'source',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Medium',
										name: 'medium',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Term',
										name: 'term',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Content',
										name: 'content',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Device',
						name: 'device',
						placeholder: 'Add Device',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'deviceUi',
								displayName: 'Device',
								values: [
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Manufacturer',
										name: 'manufacturer',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Model',
										name: 'model',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Version',
										name: 'version',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Integration',
		name: 'integrations',
		placeholder: 'Add Integration',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'identify',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'integrationsUi',
				displayName: 'Integration',
				values: [
					{
						displayName: 'All',
						name: 'all',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Salesforce',
						name: 'salesforce',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	},
];
