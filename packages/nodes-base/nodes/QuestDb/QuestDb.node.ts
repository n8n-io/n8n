import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import { pgInsert, pgQueryV2 } from '../Postgres/v1/genericFunctions';

export class QuestDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuestDB',
		name: 'questDb',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:questdb.png',
		group: ['input'],
		version: 1,
		description: 'Get, add and update data in QuestDB',
		defaults: {
			name: 'QuestDB',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		credentials: [
			{
				name: 'questDb',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Executes a SQL query',
						action: 'Execute a SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
						action: 'Insert rows in database',
					},
				],
				default: 'insert',
			},

			// ----------------------------------
			//         executeQuery
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				noDataExpression: true,
				typeOptions: {
					editor: 'sqlEditor',
					sqlDialect: 'PostgreSQL',
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
				required: true,
				description:
					'The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with query parameters.',
			},

			// ----------------------------------
			//         insert
			// ----------------------------------
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'hidden', // Schema is used by pgInsert
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '',
				description: 'Name of the schema the table belongs to',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to insert data to',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '',
				placeholder: 'id,name,description',
				description:
					'Comma-separated list of the properties which should used as columns for the new rows',
			},
			{
				displayName: 'Return Fields',
				name: 'returnFields',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
				default: '*',
				description: 'Comma-separated list of the fields that the operation will return',
			},
			// ----------------------------------
			//         additional fields
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				options: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{
								name: 'Independently',
								value: 'independently',
								description: 'Execute each query independently',
							},
							{
								name: 'Transaction',
								value: 'transaction',
								description: 'Executes all queries in a single transaction',
							},
						],
						default: 'independently',
						description:
							'The way queries should be sent to database. Can be used in conjunction with <b>Continue on Fail</b>. See <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.questdb/">the docs</a> for more examples.',
					},
					{
						displayName: 'Query Parameters',
						name: 'queryParams',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['executeQuery'],
							},
						},
						default: '',
						placeholder: 'quantity,price',
						description:
							'Comma-separated list of properties which should be used as query parameters',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'hidden',
				default: {},
				displayOptions: {
					show: {
						operation: ['insert'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('questDb');

		const pgp = pgPromise();

		const config = {
			host: credentials.host as string,
			port: credentials.port as number,
			database: credentials.database as string,
			user: credentials.user as string,
			password: credentials.password as string,
			ssl: !['disable', undefined].includes(credentials.ssl as string | undefined),
			sslmode: (credentials.ssl as string) || 'disable',
		};

		const db = pgp(config);

		let returnItems: INodeExecutionData[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'executeQuery') {
			// ----------------------------------
			//         executeQuery
			// ----------------------------------

			const additionalFields = this.getNodeParameter('additionalFields', 0);
			const mode = (additionalFields.mode || 'independently') as string;

			const queryResult = await pgQueryV2.call(this, pgp, db, items, this.continueOnFail(), {
				overrideMode: mode,
				resolveExpression: true,
			});

			returnItems = this.helpers.returnJsonArray(queryResult);
		} else if (operation === 'insert') {
			// ----------------------------------
			//         insert
			// ----------------------------------

			// Transaction and multiple won't work properly with QuestDB.
			// So we send queries independently.
			await pgInsert(this.getNodeParameter, pgp, db, items, this.continueOnFail(), 'independently');

			const returnFields = this.getNodeParameter('returnFields', 0) as string;
			const table = this.getNodeParameter('table', 0) as string;

			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			const insertData = await db.any('SELECT ${columns:name} from ${table:name}', {
				columns: returnFields
					.split(',')
					.map((value) => value.trim())
					.filter((value) => !!value),
				table,
			});

			returnItems = this.helpers.returnJsonArray(insertData);
		} else {
			await db.$pool.end();
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
		}

		// shuts down the connection pool associated with the db object to allow the process to finish
		await db.$pool.end();

		return [returnItems];
	}
}
