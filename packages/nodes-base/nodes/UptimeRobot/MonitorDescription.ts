import { INodeProperties } from 'n8n-workflow';

export const monitorOperations = [
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
				description: 'Create a new monitor.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a monitor.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all monitors.',
			},
			{
				name: 'Reset',
				value: 'reset',
				description: 'Reset a monitor.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a monitor.',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const monitorFields = [

/* -------------------------------------------------------------------------- */
/*                                monitor:create                              */
/* -------------------------------------------------------------------------- */


	{
		displayName: 'Friendly Name',
		name: 'friendly_name',
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
		description: 'the friendly name of the monitor.',
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
		description: 'the URL/IP of the monitor.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: '',
		options: [
			{ 
				name: "HTTP(s)",
				value: 1
			},
			{ 
				name: "Keyword",
				value: 2
			},
			{ 
				name: "Ping",
				value: 3
			},
			{ 
				name: "Port",
				value: 4
			},
			{ 
				name: "Heartbeat",
				value: 5
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
		description: 'the type of the monitor.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                monitor:delete                              */
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
				],
			},
		},
		description: 'the ID of the monitor.',
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
				description: 'Specify if the alert contacts set for the monitor to be returned.',
			},
			{
				displayName: 'Logs',
				name: 'logs',
				type: 'boolean',
				default: false,
				description: 'Specify if the logs of each monitor will be returned.',
			},
			{
				displayName: 'Maintenance Windows',
				name: 'mwindows',
				type: 'boolean',
				default: false,
				description: 'Specify if the maintenance windows for the monitors to be returned.',
			},
			{
				displayName: 'Monitors',
				name: 'monitors',
				type: 'string',
				description: 'Specify monitors IDs separated with dash, eg 15830-32696-83920.',
			},
			{
				displayName: 'Response Times',
				name: 'response_times',
				type: 'boolean',
				default: false,
				description: 'Specify if the response time data of each monitor will be returned.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Specify a keyword of your choice to search within url and friendly_name.',
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				default: '',
				options: [
					{
						name: 'paused',
						value: 0,
					},
					{
						name: 'not checked yet',
						value: 1,
					},
					{
						name: 'up',
						value: 2,
					},
					{
						name: 'seems down',
						value: 8,
					},
					{
						name: 'down',
						value: 9,
					},
				],	
				description: 'Select monitor statuses.',
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				default: '',
				options: [
					{ 
						name: "HTTP(s)",
						value: 1
					},
					{ 
						name: "Keyword",
						value: 2
					},
					{ 
						name: "Ping",
						value: 3
					},
					{ 
						name: "Port",
						value: 4
					},
					{ 
						name: "Heartbeat",
						value: 5
					},
				],	
				description: 'Select monitor types.',
			},
		],
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
					'reset',
					'update',
				],
			},
		},
		description: 'the ID of the monitor.',
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
				description: 'the friendly name of the monitor.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'the URL/IP of the monitor.',
			},
			{
				displayName: 'Sub type',
				name: 'sub_type',
				type: 'options',
				default: '',
				options: [
					{
						name:'HTTP (80)',
						value: 1,
					},
					{
						name:'HTTPS (443)',
						value: 2,
					},
					{
						name:'FTP (21)',
						value: 3,
					},
					{
						name:'SMTP (25)',
						value: 4,
					},
					{
						name:'POP3 (110)',
						value: 5,
					},
					{
						name:'IMAP (143)',
						value: 6,
					},
					{
						name:'Custom Port',
						value: 99,
					},
				],
				description: 'Specify which pre-defined port/service or custom port is monitored.',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: '',
				description: 'Specify the monitored port.',
			},
			{
				displayName: 'Http Username',
				name: 'http_username',
				type: 'string',
				default: '',
				description: 'Specify the username used for password-protected web pages.',
			},
			{
				displayName: 'Http Password',
				name: 'http_password',
				type: 'string',
				default: '',
				description: 'Specify the password used for password-protected web pages.',
			},
			{
				displayName: 'Http Auth Type',
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
				description: 'Specify the authentication type for password-protected web pages.',
			},
			{
				displayName: 'Http Method',
				name: 'http_method',
				type: 'options',
				default: '',
				options: [
					{
						name:'HEAD',
						value:1,
					},
					{
						name:'GET',
						value:2,
					},
					{
						name:'POST',
						value:3,
					},
					{
						name:'PUT',
						value:4,
					},
					{
						name:'PATCH',
						value:5,
					},
					{
						name:'DELETE',
						value:6,
					},
					{
						name:'OPTIONS',
						value:7,
					},
				],
				description: 'Specify the HTTP method to be used.',
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: '',
				description: 'Specify the interval for the monitoring check.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{
						name: 'paused',
						value: 0,
					},
					{
						name: 'resume',
						value: 1,
					},
				],	
				description: 'Select monitor statuses.',
			},
		],
	},
] as INodeProperties[];
