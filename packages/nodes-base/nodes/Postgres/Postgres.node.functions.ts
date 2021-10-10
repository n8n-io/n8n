import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import pgPromise = require('pg-promise');
import pg = require('pg-promise/typescript/pg-subset');

/**
 * Returns of a shallow copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function getItemsCopy(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	let newItem: IDataObject;
	return items.map(item => {
		newItem = {};
		for (const property of properties) {
			newItem[property] = item.json[property];
		}
		return newItem;
	});
}

/**
 * Returns of a shallow copy of the item which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData} item The item to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function getItemCopy(item: INodeExecutionData, properties: string[]): IDataObject {
	const newItem: IDataObject = {};
	for (const property of properties) {
		newItem[property] = item.json[property];
	}
	return newItem;
}

/**
 * Returns a returning clause from a comma separated string
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param string returning The comma separated string
 * @returns string
 */
export function generateReturning(pgp: pgPromise.IMain<{}, pg.IClient>, returning: string): string {
	return ' RETURNING ' + returning.split(',').map(returnedField => pgp.as.name(returnedField.trim())).join(', ');
}

/**
 * Executes the given SQL query on the database.
 *
 * @param {Function} getNodeParam The getter for the Node's parameters
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param {pgPromise.IDatabase<{}, pg.IClient>} db The pgPromise database connection
 * @param {input[]} input The Node's input data
 * @returns Promise<Array<IDataObject>>
 */
export async function pgQuery(
	getNodeParam: Function,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail: boolean,
	overrideMode?: string,
): Promise<IDataObject[]> {
	const additionalFields = getNodeParam('additionalFields', 0) as IDataObject;

	let valuesArray = [] as string[][];
	if (additionalFields.queryParams) {
		const propertiesString = additionalFields.queryParams as string;
		const properties = propertiesString.split(',').map(column => column.trim());
		const paramsItems = getItemsCopy(items, properties);
		valuesArray = paramsItems.map((row) => properties.map(col => row[col])) as string[][];
	}

	const allQueries = [] as Array<{query: string, values?: string[]}>;
	for (let i = 0; i < items.length; i++) {
		const query = getNodeParam('query', i) as string;
		const values = valuesArray[i];
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = overrideMode ? overrideMode : (additionalFields.mode ?? 'multiple') as string;
	if (mode === 'multiple') {
		return (await db.multi(pgp.helpers.concat(allQueries))).flat(1);
	} else if (mode === 'transaction') {
		return db.tx(async t => {
			const result: IDataObject[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					Array.prototype.push.apply(result, await t.any(allQueries[i].query, allQueries[i].values));
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({ ...items[i].json, code: err.code, message: err.message });
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async t => {
			const result: IDataObject[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					Array.prototype.push.apply(result, await t.any(allQueries[i].query, allQueries[i].values));
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({ ...items[i].json, code: err.code, message: err.message });
				}
			}
			return result;
		});
	}
	throw new Error('multiple, independently or transaction are valid options');
}

/**
 * Inserts the given items into the database.
 *
 * @param {Function} getNodeParam The getter for the Node's parameters
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param {pgPromise.IDatabase<{}, pg.IClient>} db The pgPromise database connection
 * @param {INodeExecutionData[]} items The items to be inserted
 * @returns Promise<Array<IDataObject>>
 */
export async function pgInsert(
	getNodeParam: Function,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail: boolean,
	overrideMode?: string,
): Promise<IDataObject[]> {
	const table = getNodeParam('table', 0) as string;
	const schema = getNodeParam('schema', 0) as string;
	const columnString = getNodeParam('columns', 0) as string;
	const columns = columnString.split(',')
		.map(column => column.trim().split(':'))
		.map(([name, cast]) => ({ name, cast }));
	const columnNames = columns.map(column => column.name);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	const additionalFields = getNodeParam('additionalFields', 0) as IDataObject;
	const mode = overrideMode ? overrideMode : (additionalFields.mode ?? 'multiple') as string;

	const returning = generateReturning(pgp, getNodeParam('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query = pgp.helpers.insert(getItemsCopy(items, columnNames), cs) + returning;
		return db.any(query);
	} else if (mode === 'transaction') {
		return db.tx(async t => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames);
				try {
					result.push(await t.one(pgp.helpers.insert(itemCopy, cs) + returning));
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({ ...itemCopy, code: err.code, message: err.message });
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async t => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames);
				try {
					const insertResult = await t.oneOrNone(pgp.helpers.insert(itemCopy, cs) + returning);
					if (insertResult !== null) {
						result.push(insertResult);
					}
				} catch (err) {
					if (continueOnFail === false) {
						throw err;
					}
					result.push({ ...itemCopy, code: err.code, message: err.message });
				}
			}
			return result;
		});
	}

	throw new Error('multiple, independently or transaction are valid options');
}

/**
 * Updates the given items in the database.
 *
 * @param {Function} getNodeParam The getter for the Node's parameters
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param {pgPromise.IDatabase<{}, pg.IClient>} db The pgPromise database connection
 * @param {INodeExecutionData[]} items The items to be updated
 * @returns Promise<Array<IDataObject>>
 */
export async function pgUpdate(
	getNodeParam: Function,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail = false,
): Promise<IDataObject[]> {
	const table = getNodeParam('table', 0) as string;
	const schema = getNodeParam('schema', 0) as string;
	const updateKey = getNodeParam('updateKey', 0) as string;
	const columnString = getNodeParam('columns', 0) as string;
	const columns = columnString.split(',')
		.map(column => column.trim().split(':'))
		.map(([name, cast]) => ({ name, cast }));

	const updateKeys = updateKey.split(',').map(key => {
		const [name, cast] = key.trim().split(':');
		const updateColumn = { name, cast };
		const targetCol = columns.find((column) => column.name === name);
		if (!targetCol) {
			columns.unshift(updateColumn);
		}
		else if (!targetCol.cast) {
			targetCol.cast = updateColumn.cast || targetCol.cast;
		}
		return updateColumn;
	});

	const additionalFields = getNodeParam('additionalFields', 0) as IDataObject;
	const mode = additionalFields.mode ?? 'multiple' as string;

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	// Prepare the data to update and copy it to be returned
	const columnNames = columns.map(column => column.name);
	const updateItems = getItemsCopy(items, columnNames);

	const returning = generateReturning(pgp, getNodeParam('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.update(updateItems, cs)
			+ ' WHERE ' + updateKeys.map(updateKey => {
				const key = pgp.as.name(updateKey.name);
				return 'v.' + key + ' = t.' + key;
			}).join(' AND ')
			+ returning;
		return await db.any(query);
	} else {
		const where = ' WHERE ' + updateKeys.map(updateKey => pgp.as.name(updateKey.name) + ' = ${' + updateKey.name + '}').join(' AND ');
		if (mode === 'transaction') {
			return db.tx(async t => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames);
					try {
						Array.prototype.push.apply(result, await t.any(pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning));
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({ ...itemCopy, code: err.code, message: err.message });
						return result;
					}
				}
				return result;
			});
		} else if (mode === 'independently') {
			return db.task(async t => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames);
					try {
						Array.prototype.push.apply(result, await t.any(pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning));
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({ ...itemCopy, code: err.code, message: err.message });
					}
				}
				return result;
			});
		}
	}
	throw new Error('multiple, independently or transaction are valid options');
}
