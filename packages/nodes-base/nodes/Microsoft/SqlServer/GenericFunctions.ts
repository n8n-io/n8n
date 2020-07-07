import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { ITable } from './TableInterface';

/**
 * Returns of copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function copyInputItems(
	items: INodeExecutionData[],
	properties: string[]
): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map(item => {
		newItem = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
			}
		}
		return newItem;
	});
}

/**
 * Creates a table object with the columns for the operations
 *
 * @param {INodeExecutionData[]} items The items to extract the tables/columns for
 * @param {function} getNodeParam getter for the Node's Parameters
 * @returns {object} {tableName: {colNames: [items]}};
 */
export function createTableStruct(
	items: INodeExecutionData[],
	getNodeParam: Function,
	keyName?: string
): ITable {
	return items.reduce((tables, item, index) => {
		const table = getNodeParam('table', index) as string;
		const columnString = getNodeParam('columns', index) as string;
		const keyParam = keyName
			? (getNodeParam(keyName, index) as string)
			: undefined;
		if (tables[table] === undefined) {
			tables[table] = {};
		}
		if (tables[table][columnString] === undefined) {
			tables[table][columnString] = [];
		}
		if (keyName) {
			item.json[keyName] = keyParam;
		}
		tables[table][columnString].push(item);
		return tables;
	}, {} as ITable);
}

/**
 * Creates a table object with the columns for the operations
 *
 * @param {INodeExecutionData[]} items The items to extract the tables/columns for
 * @param {function} getNodeParam getter for the Node's Parameters
 * @returns {object} {tableName: {colNames: [items]}};
 */
export function executeQueryQueue(
	tables: ITable,
	buildQueryQueue: Function
): Promise<any[]> {
	return Promise.all(
		Object.keys(tables).map(table => {
			const columnsResults = Object.keys(tables[table]).map(columnString => {
				const columns = columnString.split(',').map(column => column.trim());
				return Promise.all(
					buildQueryQueue({
						table: table,
						columnString: columnString,
						columns: columns,
						items: tables[table][columnString]
					})
				);
			});
			return Promise.all(columnsResults);
		})
	);
}

/**
 * Extracts the values from the item for INSERT
 *
 * @param {IDataObject} item The item to extract
 * @returns {string} (Val1, Val2, ...)
 */
export function extractValues(item: IDataObject): string {
	return `(${Object.values(item as any)
		.map(val => (typeof val === 'string' ? `'${val}'` : val)) // maybe other types such as dates have to be handled as well
		.join(',')})`;
}

/**
 * Extracts the SET from the item for UPDATE
 *
 * @param {IDataObject} item The item to extract from
 * @param {string[]} columns The columns to update
 * @returns {string} col1 = val1, col2 = val2
 */
export function extractUpdateSet(item: IDataObject, columns: string[]): string {
	return columns
		.map(
			column =>
				`${column} = ${
					typeof item[column] === 'string' ? `'${item[column]}'` : item[column]
				}`
		)
		.join(',');
}

/**
 * Extracts the WHERE condition from the item for UPDATE
 *
 * @param {IDataObject} item The item to extract from
 * @param {string} key The column name to build the condition with
 * @returns {string} id = '123'
 */
export function extractUpdateCondition(item: IDataObject, key: string): string {
	return `${key} = ${
		typeof item[key] === 'string' ? `'${item[key]}'` : item[key]
	}`;
}

/**
 * Extracts the WHERE condition from the items for DELETE
 *
 * @param {IDataObject[]} items The items to extract the values from
 * @param {string} key The column name to extract the value from for the delete condition
 * @returns {string} (Val1, Val2, ...)
 */
export function extractDeleteValues(items: IDataObject[], key: string): string {
	return `(${items
		.map(item => (typeof item[key] === 'string' ? `'${item[key]}'` : item[key]))
		.join(',')})`;
}
