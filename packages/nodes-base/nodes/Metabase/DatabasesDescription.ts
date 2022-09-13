import { IN8nHttpFullResponse, INodeProperties } from 'n8n-workflow';

export const databasesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['databases'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'addNewDatasource',
				description: 'Add a new datasource to the metabase instance',
				routing: {
					request: {
						method: 'POST',
						url: '/api/database',
					},
				},
				action: 'Add a databases',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many databases',
				routing: {
					request: {
						method: 'GET',
						url: '/api/database/',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get many databases',
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				description: 'Get fields from database',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/database/" + $parameter.databaseId + "/fields"}}',
					},
				},
				action: 'Get Fields a databases',
			},
		],
		default: 'getAll',
	},
];

export const databasesFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['getFields'],
			},
		},
		default: '',
	},
	{
		displayName: 'Engine',
		name: 'engine',
		type: 'options',
		required: true,
		placeholder: 'PostgreSQL',
		options: [
			{
				name: 'H2',
				value: 'h2',
			},
			{
				name: 'MongoDB',
				value: 'mongo',
			},
			{
				name: 'Mysql',
				value: 'mysql',
			},
			{
				name: 'PostgreSQL',
				value: 'postgres',
			},
			{
				name: 'Redshift',
				value: 'redshift',
			},
			{
				name: 'Sqlite',
				value: 'sqlite',
			},
		],
		default: 'postgres',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
			},
		},
		routing: {
			send: {
				property: 'engine',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		required: true,
		placeholder: 'localhost:5432',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['postgres', 'redshift', 'mysql', 'mongo'],
			},
		},
		routing: {
			send: {
				property: 'details.host',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		placeholder: 'Database 1',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
			},
		},
		routing: {
			send: {
				property: 'name',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		required: true,
		placeholder: '5432',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['postgres', 'redshift', 'mysql', 'mongo'],
			},
		},
		routing: {
			send: {
				property: 'details.port',
				type: 'body',
			},
		},
		default: 5432,
	},
	{
		displayName: 'User',
		name: 'user',
		type: 'string',
		required: true,
		placeholder: 'Admin',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['postgres', 'redshift', 'mysql', 'mongo'],
			},
		},
		routing: {
			send: {
				property: 'details.user',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		placeholder: 'password',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['postgres', 'redshift', 'mysql', 'mongo'],
			},
		},
		routing: {
			send: {
				property: 'details.password',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'Database Name',
		name: 'dbName',
		type: 'string',
		placeholder: 'Users',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['postgres', 'redshift', 'mysql', 'mongo'],
			},
		},
		routing: {
			send: {
				property: 'details.db',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'File Path',
		name: 'filePath',
		type: 'string',
		required: true,
		placeholder: 'file:/Users/admin/Desktop/Users',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
				engine: ['h2', 'sqlite'],
			},
		},
		routing: {
			send: {
				property: 'details.db',
				type: 'body',
			},
		},
		default: '',
	},
	{
		displayName: 'Full Sync',
		name: 'fullSync',
		type: 'boolean',
		required: true,
		default: true,
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['addNewDatasource'],
			},
		},
		routing: {
			send: {
				property: 'is_full_sync',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['databases'],
				operation: ['getAll'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{$value}}',
						properties: {
							id: '={{$responseItem.id}}',
							name: '={{$responseItem.name}}',
							description: '={{$responseItem.description}}',
							engine: '={{$responseItem.engine}}',
							creator_id: '={{$responseItem.creator_id}}',
							timezone: '={{$responseItem.timezone}}',
							created_at: '={{$responseItem.created_at}}',
							updated_at: '={{$responseItem.updated_at}}',
							db: '={{$responseItem.details.db}}',
							user: '={{$responseItem.details.user}}',
							host: '={{$responseItem.details.host}}',
							port: '={{$responseItem.details.port}}',
							ssl: '={{$responseItem.details.ssl}}',
							is_full_sync: '={{$responseItem.details.is_full_sync}}',
						},
					},
				],
			},
		},
		default: true,
	},
];

type MetabaseDatabaseResult = IN8nHttpFullResponse & {
	body: Array<{
		data: Array<{
			id: number;
			name: string;
			description: string;
			details: MetabaseDatabaseDetail;
			timezone: string;
			creator_id: number;
			created_at: string;
			updated_at: string;
			engine: string;
			is_full_sync: string;
		}>;
	}>;
};

type MetabaseDatabaseDetail = {
	host?: string;
	port?: number;
	user?: string;
	ssl?: boolean;
	db?: string;
};
