import {
	INodeProperties,
} from 'n8n-workflow';

export const monitorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a monitor',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a monitor',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a monitor',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all monitors',
			},
			{
				name: 'Reset',
				value: 'reset',
				description: 'Reset a monitor',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a monitor',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const monitorFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                monitor:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Friendly Name',
		name: 'friendlyName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The friendly name of the monitor.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'Heartbeat',
				value: 5,
			},
			{
				name: 'HTTP(S)',
				value: 1,
			},
			{
				name: 'Keyword',
				value: 2,
			},
			{
				name: 'Ping',
				value: 3,
			},
			{
				name: 'Port',
				value: 4,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The type of the monitor.',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The URL/IP of the monitor.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                monitor:delete/reset                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'delete',
					'reset',
					'get',
				],
			},
		},
		description: 'The ID of the monitor.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                monitor:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Alert Contacts',
				name: 'alert_contacts',
				type: 'boolean',
				default: false,
				description: 'Whether the alert contacts set for the monitor to be returned.',
			},
			{
				displayName: 'Logs',
				name: 'logs',
				type: 'boolean',
				default: false,
				description: 'If the logs of each monitor will be returned.',
			},
			{
				displayName: 'Maintenance Window',
				name: 'mwindow',
				type: 'boolean',
				default: false,
				description: 'If the maintenance windows for the monitors to be returned.',
			},
			{
				displayName: 'Monitor IDs',
				name: 'monitors',
				type: 'string',
				default: '',
				description: 'Monitors IDs separated with dash, e.g. 15830-32696-83920.',
			},
			{
				displayName: 'Response Times',
				name: 'response_times',
				type: 'boolean',
				default: false,
				description: 'Whether the response time data of each monitor will be returned.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'A keyword to be matched against url and friendly name.',
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				default: '',
				options: [
					{
						name: 'Paused',
						value: 0,
					},
					{
						name: 'Not Checked Yet',
						value: 1,
					},
					{
						name: 'Up',
						value: 2,
					},
					{
						name: 'Seems Down',
						value: 8,
					},
					{
						name: 'Down',
						value: 9,
					},
				],
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				default: '',
				options: [
					{
						name: 'Heartbeat',
						value: 5,
					},
					{
						name: 'HTTP(S)',
						value: 1,
					},
					{
						name: 'Keyword',
						value: 2,
					},
					{
						name: 'Ping',
						value: 3,
					},
					{
						name: 'Port',
						value: 4,
					},
				],
				description: 'Select monitor types.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                monitor:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the monitor.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'monitor',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Friendly Name',
				name: 'friendly_name',
				type: 'string',
				default: '',
				description: 'The friendly name of the monitor.',
			},
			{
				displayName: 'HTTP Auth Type',
				name: 'http_auth_type',
				type: 'options',
				default: '',
				options: [
					{
						name: 'HTTP Basic',
						value: 1,
					},
					{
						name: 'Digest',
						value: 2,
					},
				],
				description: 'The authentication type for password-protected web pages.',
			},
			{
				displayName: 'HTTP Method',
				name: 'http_method',
				type: 'options',
				default: '',
				options: [
					{
						name: 'DELETE',
						value: 6,
					},
					{
						name: 'GET',
						value: 2,
					},
					{
						name: 'HEAD',
						value: 1,
					},
					{
						name: 'OPTIONS',
						value: 7,
					},
					{
						name: 'PATCH',
						value: 5,
					},
					{
						name: 'POST',
						value: 3,
					},
					{
						name: 'PUT',
						value: 4,
					},
				],
				description: 'The HTTP method to be used.',
			},
			{
				displayName: 'HTTP Password',
				name: 'http_password',
				type: 'string',
				default: '',
				description: 'The password used for password-protected web pages.',
			},
			{
				displayName: 'HTTP Username',
				name: 'http_username',
				type: 'string',
				default: '',
				description: 'The username used for password-protected web pages.',
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: '',
				description: 'The interval for the monitoring check.',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: '',
				description: 'The monitored port.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Pause',
						value: 0,
					},
					{
						name: 'Resume',
						value: 1,
					},
				],
				description: 'Select monitor statuses.',
			},
			{
				displayName: 'Sub type',
				name: 'sub_type',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Custom Port',
						value: 99,
					},
					{
						name: 'FTP (21)',
						value: 3,
					},
					{
						name: 'HTTP (80)',
						value: 1,
					},
					{
						name: 'HTTPS (443)',
						value: 2,
					},
					{
						name: 'IMAP (143)',
						value: 6,
					},
					{
						name: 'POP3 (110)',
						value: 5,
					},
					{
						name: 'SMTP (25)',
						value: 4,
					},
				],
				description: 'Specify which pre-defined port/service or custom port is monitored.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'The URL/IP of the monitor.',
			},
		],
	},
];
