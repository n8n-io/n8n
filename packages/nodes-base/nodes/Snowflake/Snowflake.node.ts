import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import snowflake from 'snowflake-sdk';

import { resolveQueryReplacementSegments } from '@utils/sql-query-parameters';
import { resolveExpressions } from '@utils/utilities';

import {
	connect,
	destroy,
	escapeSnowflakeIdentifier,
	escapeSnowflakeObjectIdentifier,
	execute,
	prepareQueryResults,
	toErrorItem,
	type SnowflakeCredential,
} from './GenericFunctions';

export class Snowflake implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Snowflake',
		name: 'snowflake',
		icon: 'file:snowflake.svg',
		group: ['input'],
		version: [1, 1.1, 1.2],
		description: 'Get, add and update data in Snowflake',
		defaults: {
			name: 'Snowflake',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		credentials: [
			{
				name: 'snowflake',
				required: true,
				displayOptions: {
					show: {
						authentication: ['credentials'],
					},
				},
			},
			{
				name: 'snowflakeOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Credentials',
						value: 'credentials',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'credentials',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query',
						action: 'Execute a SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows in database',
						action: 'Insert rows in database',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in database',
						action: 'Update rows in database',
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
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < 40',
				required: true,
				description:
					"The SQL query to execute. Use ? (bound in order) or :1, :2, :3 to refer to the 'Query Parameters' set in the options below.",
				hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Query Parameters',
						name: 'queryReplacement',
						type: 'string',
						default: '',
						placeholder: 'e.g. value1,value2,value3',
						description:
							'Comma-separated list of the values you want to use as query parameters. You can drag the values from the input panel on the left.',
						hint: 'Comma-separated list of values: reference them in your query as ? (in order) or :1, :2, :3…',
					},
				],
			},

			// ----------------------------------
			//         insert
			// ----------------------------------
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

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table in which to update data in',
			},
			{
				displayName: 'Update Key',
				name: 'updateKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: 'id',
				required: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				placeholder: 'name,description',
				description:
					'Comma-separated list of the properties which should used as columns for rows to update',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Disable logging - https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-logs#configure-the-default-logging-behavior
		// Parse VARIANT/OBJECT/ARRAY columns with JSON.parse. The SDK keeps its XML
		// fallback for non-JSON values, and STRICT_JSON_OUTPUT (set on the session
		// below) renders non-finite numbers as null so the output is always valid JSON.
		snowflake.configure({
			logFilePath: 'STDOUT',
			logLevel: 'OFF',
			jsonColumnVariantParser: JSON.parse,
		});

		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;

		let connection: snowflake.Connection;
		try {
			const credential = await getCredential.call(this);
			connection = await connect(credential, this.getNode());
		} catch (error) {
			return [failAllItems.call(this, error, items)];
		}

		// Destroy on failure too, otherwise the leaked session keeps its table locks.
		try {
			try {
				// Render non-finite numbers (NaN, Infinity) in VARIANT/OBJECT/ARRAY columns as
				// null so the column output is always valid JSON for the parser above.
				await execute(
					connection,
					'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE',
					[],
					this.getNode(),
				);
			} catch (error) {
				return [failAllItems.call(this, error, items)];
			}

			const operation = this.getNodeParameter('operation', 0);

			if (operation === 'executeQuery') {
				return [await executeQuery.call(this, connection, items, nodeVersion)];
			}
			if (operation === 'insert') {
				return [await insertRows.call(this, connection, items)];
			}
			if (operation === 'update') {
				return [await updateRows.call(this, connection, items)];
			}

			return [[]];
		} finally {
			await closeConnection.call(this, connection);
		}
	}
}

async function getCredential(this: IExecuteFunctions): Promise<SnowflakeCredential> {
	const authMethod = this.getNodeParameter('authentication', 0, 'credentials') as string;

	if (authMethod !== 'oAuth2') {
		return await this.getCredentials<SnowflakeCredential>('snowflake');
	}

	const oauthCredentials = await this.getCredentials('snowflakeOAuth2Api');
	const tokenData = oauthCredentials.oauthTokenData as { access_token?: string } | undefined;
	if (!tokenData?.access_token) {
		throw new NodeOperationError(
			this.getNode(),
			'OAuth2 access token is missing. Please reconnect your Snowflake OAuth2 credential.',
		);
	}
	return {
		account: oauthCredentials.account as string,
		database: oauthCredentials.database as string,
		warehouse: oauthCredentials.warehouse as string,
		schema: oauthCredentials.schema as string,
		clientSessionKeepAlive: oauthCredentials.clientSessionKeepAlive as boolean,
		authentication: 'oauth2',
		token: tokenData.access_token,
	};
}

/** Throw the error, or with "Continue" on error, return one error item for each input item. */
function failAllItems(
	this: IExecuteFunctions,
	error: unknown,
	items: INodeExecutionData[],
): INodeExecutionData[] {
	if (!this.continueOnFail()) throw error;
	return items.map((_item, itemIndex) => toErrorItem(error, itemIndex));
}

async function closeConnection(this: IExecuteFunctions, connection: snowflake.Connection) {
	try {
		await destroy(connection, this.getNode());
	} catch (error) {
		// With "Continue" on error, keep the output of the statements that already ran.
		if (!this.continueOnFail()) throw error;
	}
}

async function executeQuery(
	this: IExecuteFunctions,
	connection: snowflake.Connection,
	items: INodeExecutionData[],
	nodeVersion: number,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const query = resolveExpressions(
				this.getNodeParameter('query', i) as string,
				(resolvable) => this.evaluateExpression(resolvable, i),
				{ legacy: nodeVersion < 1.2 },
			);

			const options = this.getNodeParameter('options', i, {});
			const rawReplacement = options.queryReplacement;
			let binds: snowflake.Bind[] = [];

			if (rawReplacement !== undefined && rawReplacement !== '') {
				if (typeof rawReplacement === 'string') {
					binds = resolveQueryReplacementSegments.call(this, i, rawReplacement) as snowflake.Bind[];
				} else if (Array.isArray(rawReplacement)) {
					binds = rawReplacement as snowflake.Bind[];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'Query Parameters must be a string of comma-separated values, or an array of values',
						{ itemIndex: i },
					);
				}
			}

			const responseData = await execute(connection, query, binds, this.getNode(), i);
			const executionData = await prepareQueryResults.call(
				this,
				responseData as IDataObject[] | undefined,
				i,
				nodeVersion,
			);
			returnData = returnData.concat(executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			returnData.push(toErrorItem(error, i));
		}
	}

	return returnData;
}

async function insertRows(
	this: IExecuteFunctions,
	connection: snowflake.Connection,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	try {
		const table = this.getNodeParameter('table', 0) as string;
		const columnString = this.getNodeParameter('columns', 0) as string;
		const columns = columnString.split(',').map((column) => column.trim());
		const quotedTable = escapeSnowflakeObjectIdentifier(table);
		const quotedColumns = columns.map(escapeSnowflakeIdentifier);
		const query = `INSERT INTO ${quotedTable} (${quotedColumns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
		const data = this.helpers.copyInputItems(items, columns);
		const binds = data.map((element) => [...Object.values(element)]);
		await execute(connection, query, binds as snowflake.Binds, this.getNode());

		let returnData: INodeExecutionData[] = [];
		data.forEach((d, i) => {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(d),
				{ itemData: { item: i } },
			);
			returnData = returnData.concat(executionData);
		});
		return returnData;
	} catch (error) {
		// One statement inserts every row, so a failure applies to all items.
		return failAllItems.call(this, error, items);
	}
}

async function updateRows(
	this: IExecuteFunctions,
	connection: snowflake.Connection,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	try {
		const table = this.getNodeParameter('table', 0) as string;
		const updateKey = this.getNodeParameter('updateKey', 0) as string;
		const columnString = this.getNodeParameter('columns', 0) as string;
		const columns = columnString.split(',').map((column) => column.trim());

		if (!columns.includes(updateKey)) {
			columns.unshift(updateKey);
		}

		const quotedTable = escapeSnowflakeObjectIdentifier(table);
		const quotedColumns = columns.map(escapeSnowflakeIdentifier);
		const quotedUpdateKey = escapeSnowflakeIdentifier(updateKey);
		const query = `UPDATE ${quotedTable} SET ${quotedColumns.map((col) => `${col} = ?`).join(',')} WHERE ${quotedUpdateKey} = ?;`;
		const data = this.helpers.copyInputItems(items, columns);
		const binds = data.map((element) => {
			const values = Object.values(element);
			const rowBinds: unknown[] = [];
			columns.forEach((_col, idx) => {
				rowBinds.push(values[idx]);
			});
			rowBinds.push(element[updateKey]);
			return rowBinds;
		});

		let returnData: INodeExecutionData[] = [];

		// Each row has its own statement, so a failure applies only to that item.
		for (let i = 0; i < binds.length; i++) {
			try {
				await execute(connection, query, binds[i] as snowflake.Binds, this.getNode(), i);
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(data[i]),
					{ itemData: { item: i } },
				);
				returnData = returnData.concat(executionData);
			} catch (error) {
				if (!this.continueOnFail()) throw error;
				returnData.push(toErrorItem(error, i));
			}
		}

		return returnData;
	} catch (error) {
		// A row failure reaches this point only when the node must stop, so this rethrows it.
		return failAllItems.call(this, error, items);
	}
}
