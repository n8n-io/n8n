import type { INodeProperties } from 'n8n-workflow';

export const trackOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['track'],
			},
		},
		options: [
			{
				name: 'Event',
				value: 'event',
				description:
					'Record the actions your users perform. Every action triggers an event, which can also have associated properties.',
				action: 'Track an event',
			},
			{
				name: 'Page',
				value: 'page',
				description:
					'Record page views on your website, along with optional extra information about the page being viewed',
				action: 'Track a page',
			},
		],
		default: 'event',
	},
];

export const trackFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                track:event                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['event'],
			},
		},
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['event'],
			},
		},
		description: 'Name of the action that a user has performed',
		required: true,
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
				resource: ['track'],
				operation: ['event'],
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
						default: false,
						description: 'Whether a user is active',
					},
					{
						displayName: 'IP',
						name: 'ip',
						type: 'string',
						default: '',
						description: 'Current user’s IP address',
					},
					{
						displayName: 'Locale',
						name: 'locate',
						type: 'string',
						default: '',
						description: 'Locale string for the current user, for example en-US',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'string',
						default: '',
						description:
							'Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						description:
							'Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York',
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
				resource: ['track'],
				operation: ['event'],
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
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Properties',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['event'],
			},
		},
		default: {},
		options: [
			{
				name: 'propertiesUi',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                track:page                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['page'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['page'],
			},
		},
		description:
			'Name of the page For example, most sites have a “Signup” page that can be useful to tag, so you can see users as they move through your funnel',
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
				resource: ['track'],
				operation: ['page'],
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
						default: false,
						description: 'Whether a user is active',
					},
					{
						displayName: 'IP',
						name: 'ip',
						type: 'string',
						default: '',
						description: 'Current user’s IP address',
					},
					{
						displayName: 'Locale',
						name: 'locate',
						type: 'string',
						default: '',
						description: 'Locale string for the current user, for example en-US',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'string',
						default: '',
						description:
							'Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						description:
							'Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York',
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
				resource: ['track'],
				operation: ['page'],
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
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Properties',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['track'],
				operation: ['page'],
			},
		},
		default: {},
		options: [
			{
				name: 'propertiesUi',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];
