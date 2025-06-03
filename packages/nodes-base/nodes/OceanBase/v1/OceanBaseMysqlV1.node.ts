import type mysql2 from 'mysql2/promise';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { oldVersionNotice } from '@utils/descriptions';
import { getResolvables } from '@utils/utilities';

import { createConnection, searchTables } from './GenericFunctions';

const versionDescription: INodeTypeDescription = {
	displayName: 'OceanBase MySQL',
	name: 'oceanBaseMySQL',
	icon: 'file:oceanbase.svg',
	group: ['input'],
	version: 1,
	description: 'Get, add and update data in OceanBase MySQL',
	defaults: {
		name: 'OceanBase MySQL',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'oceanBaseJDBC',
			required: true,
			testedBy: 'mysqlConnectionTest',
		},
	],
	properties: [
		oldVersionNotice,
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Execute Query',
					value: 'executeQuery',
					action: 'Execute a SQL query',
				},
				{
					name: 'Insert',
					value: 'insert',
					action: 'Insert rows in database',
				},
				{
					name: 'Update',
					value: 'update',
					action: 'Update rows in database',
				},
			],
			default: 'insert',
		},

		// Execute Query
		{
			displayName: 'Query',
			name: 'query',
			type: 'string',
			typeOptions: {
				editor: 'sqlEditor',
				sqlDialect: 'MySQL',
			},
			displayOptions: {
				show: {
					operation: ['executeQuery'],
				},
			},
			default: '',
			placeholder: 'SELECT id, name FROM product WHERE id < ?',
			required: true,
		},

		// Insert
		{
			displayName: 'Table',
			name: 'table',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a Table...',
					typeOptions: {
						searchListMethod: 'searchTables',
						searchable: true,
					},
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					placeholder: 'table_name',
				},
			],
			displayOptions: {
				show: {
					operation: ['insert'],
				},
			},
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
			requiresDataPath: 'multiple',
			default: '',
			placeholder: 'id,name,description',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			displayOptions: {
				show: {
					operation: ['insert'],
				},
			},
			default: {},
			options: [
				{
					displayName: 'Ignore',
					name: 'ignore',
					type: 'boolean',
					default: true,
				},
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'options',
					options: [
						{
							name: 'Low Priority',
							value: 'LOW_PRIORITY',
						},
						{
							name: 'High Priority',
							value: 'HIGH_PRIORITY',
						},
					],
					default: 'LOW_PRIORITY',
				},
			],
		},

		// Update
		{
			displayName: 'Table',
			name: 'table',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a Table...',
					typeOptions: {
						searchListMethod: 'searchTables',
						searchable: true,
					},
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					placeholder: 'table_name',
				},
			],
			displayOptions: {
				show: {
					operation: ['update'],
				},
			},
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
		},
		{
			displayName: 'Columns',
			name: 'columns',
			type: 'string',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					operation: ['update'],
				},
			},
			default: '',
			placeholder: 'name,description',
		},
	],
};

export class OceanBaseMySQLV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		credentialTest: {
			async mysqlConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					const connection = await createConnection(credentials);
					await connection.end();
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
		listSearch: {
			searchTables,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('oceanBaseJDBC');
		const connection = await createConnection(credentials);
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnItems: INodeExecutionData[] = [];

		if (operation === 'executeQuery') {
			const queryQueue = items.map(async (_, index) => {
				let rawQuery = (this.getNodeParameter('query', index) as string).trim();

				for (const resolvable of getResolvables(rawQuery)) {
					rawQuery = rawQuery.replace(
						resolvable,
						this.evaluateExpression(resolvable, index) as string,
					);
				}

				return await connection.query(rawQuery);
			});

			returnItems = ((await Promise.all(queryQueue)) as mysql2.OkPacket[][]).reduce(
				(collection, result, index) => {
					const [rows] = result;
					collection.push(
						...this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(rows as unknown as IDataObject[]),
							{ itemData: { item: index } },
						),
					);
					return collection;
				},
				[] as INodeExecutionData[],
			);
		} else if (operation === 'insert') {
			const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map((column) => column.trim());
			const insertItems = this.helpers.copyInputItems(items, columns);
			const insertPlaceholder = `(${columns.map((_column) => '?').join(',')})`;
			const options = this.getNodeParameter('options', 0);
			const insertIgnore = options.ignore as boolean;
			const insertPriority = options.priority as string;

			const insertSQL = `INSERT ${insertPriority || ''} ${
				insertIgnore ? 'IGNORE' : ''
			} INTO ${table}(${columnString}) VALUES ${items
				.map((_item) => insertPlaceholder)
				.join(',')};`;
			const queryItems = insertItems.reduce(
				(collection: IDataObject[], item) =>
					collection.concat(Object.values(item) as IDataObject[]),
				[],
			);

			const queryResult = await connection.query(insertSQL, queryItems);

			returnItems = this.helpers.returnJsonArray(queryResult[0] as unknown as IDataObject);
		} else if (operation === 'update') {
			const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
			const updateKey = this.getNodeParameter('updateKey', 0) as string;
			const columnString = this.getNodeParameter('columns', 0) as string;
			const columns = columnString.split(',').map((column) => column.trim());

			if (!columns.includes(updateKey)) {
				columns.unshift(updateKey);
			}

			const updateItems = this.helpers.copyInputItems(items, columns);
			const updateSQL = `UPDATE ${table} SET ${columns
				.map((column) => `${column} = ?`)
				.join(',')} WHERE ${updateKey} = ?;`;
			const queryQueue = updateItems.map(
				async (item) =>
					await connection.query(updateSQL, Object.values(item).concat(item[updateKey])),
			);
			const queryResult = await Promise.all(queryQueue);
			returnItems = this.helpers.returnJsonArray(
				queryResult.map((result) => result[0]) as unknown as IDataObject[],
			);
		} else {
			returnItems = this.helpers.returnJsonArray({
				error: `The operation "${operation}" is not supported!`,
			});
		}

		await connection.end();

		return [returnItems];
	}
}
