import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const databasesOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the databases',
				routing: {
					request: {
						method: 'GET',
						url: '/api/database/',
					},
				},
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
			},
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
				},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const databasesFields: INodeProperties[] = [
	{
		displayName: 'Database Id',
		name: 'databaseId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
								operation: [
										'getFields',
								],
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
				name: 'PostgreSQL',
				value: 'postgres',
			},
			{
				name: 'Redshift',
				value: 'redshift',
			},
			{
				name: 'Mysql',
				value: 'mysql',
			},
			{
				name: 'Sqlite',
				value: 'sqlite',
			},
			{
				name: 'MongoDB',
				value: 'mongo',
			},
			{
				name: 'H2',
				value: 'h2',
			}
		],
		default: 'postgres',
		description: 'The resource to operate on.',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
								operation: [
										'addNewDatasource',
								],
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
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'postgres',
					'redshift',
					'mysql',
					'mongo',
				],
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
				resource: [
					'databases',
				],
								operation: [
										'addNewDatasource',
								],
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
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'postgres',
					'redshift',
					'mysql',
					'mongo',
				],
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
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'postgres',
					'redshift',
					'mysql',
					'mongo',
				],
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
		required: true,
		placeholder: 'password',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'postgres',
					'redshift',
					'mysql',
					'mongo',
				],
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
		displayName: 'Database name',
		name: 'dbName',
		type: 'string',
		required: false,
		placeholder: 'Users',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'postgres',
					'redshift',
					'mysql',
					'mongo',
				],
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
		displayName: 'File path',
		name: 'filePath',
		type: 'string',
		required: true,
		placeholder: 'file:/Users/admin/Desktop/Users',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
				operation: [
						'addNewDatasource',
				],
				engine: [
					'h2',
					'sqlite',
				],
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
		displayName: 'Full sync',
		name: 'fullSync',
		type: 'boolean',
		required: true,
		default: true,
		routing: {
			send: {
				property: 'is_full_sync',
				type: 'body',
			},
		},
	},
];
