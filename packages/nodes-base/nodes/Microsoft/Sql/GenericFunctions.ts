/* eslint-disable @typescript-eslint/ban-types */
import { deepCopy, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { ITables } from './TableInterface';

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
	buildQueryQueue: Function,
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

/**
 * Extracts the values from the item for INSERT
 *
 * @param {IDataObject} item The item to extract
 */
export function extractValues(item: IDataObject): string {
	return `(${Object.values(item as any)
		.map((val) => {
			//the column cannot be found in the input
			//so, set it to null in the sql query
			if (val === null) {
				return 'NULL';
			} else if (typeof val === 'string') {
				return `'${val.replace(/'/g, "''")}'`;
			} else if (typeof val === 'boolean') {
				return +!!val;
			}
			return val;
		}) // maybe other types such as dates have to be handled as well
		.join(',')})`;
}

/**
 * Extracts the SET from the item for UPDATE
 *
 * @param {IDataObject} item The item to extract from
 * @param {string[]} columns The columns to update
 */
export function extractUpdateSet(item: IDataObject, columns: string[]): string {
	return columns
		.map(
			(column) =>
				`"${column}" = ${typeof item[column] === 'string' ? `'${item[column]}'` : item[column]}`,
		)
		.join(',');
}

/**
 * Extracts the WHERE condition from the item for UPDATE
 *
 * @param {IDataObject} item The item to extract from
 * @param {string} key The column name to build the condition with
 */
export function extractUpdateCondition(item: IDataObject, key: string): string {
	return `${key} = ${typeof item[key] === 'string' ? `'${item[key]}'` : item[key]}`;
}

/**
 * Extracts the WHERE condition from the items for DELETE
 *
 * @param {IDataObject[]} items The items to extract the values from
 * @param {string} key The column name to extract the value from for the delete condition
 */
export function extractDeleteValues(items: IDataObject[], key: string): string {
	return `(${items
		.map((item) => (typeof item[key] === 'string' ? `'${item[key]}'` : item[key]))
		.join(',')})`;
}

export function formatColumns(columns: string) {
	return columns
		.split(',')
		.map((column) => `"${column.trim()}"`)
		.join(',');
}
