import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import type { ITables, OperationInputData } from './interfaces';
import { chunk, flatten } from '@utils/utilities';
import mssql from 'mssql';

/**
 * Returns a copy of the item which only contains the json data and
 * of that only the defined properties
 *
 * @param {INodeExecutionData} item The item to copy
 * @param {string[]} properties The properties it should include
 */
export function copyInputItem(item: INodeExecutionData, properties: string[]): IDataObject {
	// Prepare the data to insert and copy it to be returned
	const newItem: IDataObject = {};
	for (const property of properties) {
		if (item.json[property] === undefined) {
			newItem[property] = null;
		} else {
			newItem[property] = deepCopy(item.json[property]);
		}
	}
	return newItem;
}

/**
 * Creates an ITables with the columns for the operations
 *
 * @param {INodeExecutionData[]} items The items to extract the tables/columns for
 * @param {function} getNodeParam getter for the Node's Parameters
 */
export function createTableStruct(
	// eslint-disable-next-line @typescript-eslint/ban-types
	getNodeParam: Function,
	items: INodeExecutionData[],
	additionalProperties: string[] = [],
	keyName?: string,
): ITables {
	return items.reduce((tables, item, index) => {
		const table = getNodeParam('table', index) as string;
		const columnString = getNodeParam('columns', index) as string;
		const columns = columnString.split(',').map((column) => column.trim());
		const itemCopy = copyInputItem(item, columns.concat(additionalProperties));
		const keyParam = keyName ? (getNodeParam(keyName, index) as string) : undefined;
		if (tables[table] === undefined) {
			tables[table] = {};
		}
		if (tables[table][columnString] === undefined) {
			tables[table][columnString] = [];
		}
		if (keyName) {
			itemCopy[keyName] = keyParam;
		}
		tables[table][columnString].push(itemCopy);
		return tables;
	}, {} as ITables);
}

/**
 * Executes a queue of queries on given ITables.
 *
 * @param {ITables} tables The ITables to be processed.
 * @param {function} buildQueryQueue function that builds the queue of promises
 */
export async function executeQueryQueue(
	tables: ITables,
	buildQueryQueue: (data: OperationInputData) => Array<Promise<object>>,
): Promise<any[]> {
	return Promise.all(
		Object.keys(tables).map(async (table) => {
			const columnsResults = Object.keys(tables[table]).map(async (columnString) => {
				return Promise.all(
					buildQueryQueue({
						table,
						columnString,
						items: tables[table][columnString],
					}),
				);
			});
			return Promise.all(columnsResults);
		}),
	);
}

export function formatColumns(columns: string) {
	return columns
		.split(',')
		.map((column) => `[${column.trim()}]`)
		.join(', ');
}

export function configurePool(credentials: IDataObject) {
	const config = {
		server: credentials.server as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
		domain: credentials.domain ? (credentials.domain as string) : undefined,
		connectionTimeout: credentials.connectTimeout as number,
		requestTimeout: credentials.requestTimeout as number,
		options: {
			encrypt: credentials.tls as boolean,
			enableArithAbort: false,
			tdsVersion: credentials.tdsVersion as string,
			trustServerCertificate: credentials.allowUnauthorizedCerts as boolean,
		},
	};

	return new mssql.ConnectionPool(config);
}

export async function insertOperation(tables: ITables, pool: mssql.ConnectionPool) {
	return executeQueryQueue(
		tables,
		({ table, columnString, items }: OperationInputData): Array<Promise<object>> => {
			return chunk(items, 1000).map(async (insertValues) => {
				const request = pool.request();

				const valuesPlaceholder = [];

				for (const [rIndex, entry] of insertValues.entries()) {
					const row = Object.values(entry);
					valuesPlaceholder.push(`(${row.map((_, vIndex) => `@r${rIndex}v${vIndex}`).join(', ')})`);
					for (const [vIndex, value] of row.entries()) {
						request.input(`r${rIndex}v${vIndex}`, value);
					}
				}

				const query = `INSERT INTO [${table}] (${formatColumns(
					columnString,
				)}) VALUES ${valuesPlaceholder.join(', ')};`;

				return request.query(query);
			});
		},
	);
}

export async function updateOperation(tables: ITables, pool: mssql.ConnectionPool) {
	return executeQueryQueue(
		tables,
		({ table, columnString, items }: OperationInputData): Array<Promise<object>> => {
			return items.map(async (item) => {
				const request = pool.request();
				const columns = columnString.split(',').map((column) => column.trim());

				const setValues: string[] = [];
				const condition = `${item.updateKey} = @condition`;
				request.input('condition', item[item.updateKey as string]);

				for (const [index, col] of columns.entries()) {
					setValues.push(`[${col}] = @v${index}`);
					request.input(`v${index}`, item[col]);
				}

				const query = `UPDATE [${table}] SET ${setValues.join(', ')} WHERE ${condition};`;

				return request.query(query);
			});
		},
	);
}

export async function deleteOperation(tables: ITables, pool: mssql.ConnectionPool) {
	const queriesResults = await Promise.all(
		Object.keys(tables).map(async (table) => {
			const deleteKeyResults = Object.keys(tables[table]).map(async (deleteKey) => {
				const deleteItemsList = chunk(
					tables[table][deleteKey].map((item) =>
						copyInputItem(item as INodeExecutionData, [deleteKey]),
					),
					1000,
				);
				const queryQueue = deleteItemsList.map(async (deleteValues) => {
					const request = pool.request();
					const valuesPlaceholder: string[] = [];

					for (const [index, entry] of deleteValues.entries()) {
						valuesPlaceholder.push(`@v${index}`);
						request.input(`v${index}`, entry[deleteKey]);
					}

					const query = `DELETE FROM [${table}] WHERE [${deleteKey}] IN (${valuesPlaceholder.join(
						', ',
					)});`;

					return request.query(query);
				});
				return Promise.all(queryQueue);
			});
			return Promise.all(deleteKeyResults);
		}),
	);

	return flatten(queriesResults).reduce(
		(acc: number, resp: mssql.IResult<object>): number =>
			(acc += resp.rowsAffected.reduce((sum, val) => (sum += val))),
		0,
	);
}
