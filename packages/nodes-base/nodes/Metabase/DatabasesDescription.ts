import {
	IDataObject,
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
					output: {
						postReceive: [
						// @ts-ignore
						function(
							this: IExecuteSingleFunctions,
							_items: INodeExecutionData[],
							response: MetabaseDatabaseResult,
						): INodeExecutionData[] {
							// @ts-ignore
							return response.body.data.map((metabaseDatabase) => {
								if(!this.getNode().parameters.simple){
									return {
										json: {
											...metabaseDatabase,
									},
								};
								} else{
								return {
									json: {
										name: metabaseDatabase.name,
										id: metabaseDatabase.id,
										description: metabaseDatabase.description,
										engine: metabaseDatabase.engine,
										creator_id: metabaseDatabase.creator_id,
										timezone: metabaseDatabase.timezone,
										created_at: metabaseDatabase.created_at,
										updated_at: metabaseDatabase.updated_at,
										db: metabaseDatabase.details.db,
										user: metabaseDatabase.details.user,
										host: metabaseDatabase.details.host,
										port: metabaseDatabase.details.port,
										ssl: metabaseDatabase.details.ssl,
										is_full_sync: metabaseDatabase.details.is_full_sync,
									},
								};
							}
							});
						},
						],
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
				property: 'is_full_sync',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databases',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
	},
];

type MetabaseDatabaseResult = IN8nHttpFullResponse & {
	body: Array<{data: Array<{id: number, name: string, description: string, details: MetabaseDatabaseDetail,timezone: string, creator_id: number,created_at: string, updated_at: string, engine: string, is_full_sync: string,  }>}>
};

type MetabaseDatabaseDetail = {
	host?: string;
	port?: number;
	user?: string;
	ssl?: boolean;
	db?: string;
};
