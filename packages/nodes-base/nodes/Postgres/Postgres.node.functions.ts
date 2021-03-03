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
export function getItemCopy(item: INodeExecutionData, properties: string[]): IDataObject[] {
	const newItem: IDataObject = {};
	for (const property of properties) {
		newItem[property] = item.json[property];
	}
	return newItem;
}

/**
 * Executes the given SQL query on the database.
 *
 * @param {Function} getNodeParam The getter for the Node's parameters
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param {pgPromise.IDatabase<{}, pg.IClient>} db The pgPromise database connection
 * @param {input[]} input The Node's input data
 * @returns Promise<Array<object>>
 */
export async function pgQuery(
	getNodeParam: Function,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	input: INodeExecutionData[],
	mode: string,
	continueOnFail: boolean,
): Promise<object[][]> {
	if(mode == 'normal' || mode == 'transaction') {
		const queries: string[] = [];
		for (let i = 0; i < input.length; i++) {
			queries.push(getNodeParam('query', i) as string);
		}
		if(mode == 'normal') return db.multi(pgp.helpers.concat(queries));
		return db.tx(t => return t.multi(pgp.helpers.concat(queries)));
	} else if(mode == 'independently') {
		return db.task(t => {
			const result = [];
			for (let i = 0; i < input.length; i++) {
				try {
					result.push(await t.any(getNodeParam('query', i) as string));
				} catch(err) {
					if(continueOnFail === false) throw err;
					result.push([{code: err.code, message: err.message}]);
				}
			}
			return result;
		});
	} else throw new Error('normal, independently or transaction are valid options');
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
	mode: string,
	continueOnFail: boolean,
): Promise<IDataObject[]> {
	const table = getNodeParam('table', 0) as string;
	const schema = getNodeParam('schema', 0) as string;
	const returnFields = ((getNodeParam('returnFields', 0) as string).split(',') as string[])
		.map(value => value.trim()).filter(value => !!value);
	const columns = (getNodeParam('columns', 0) as string).split(',').map(column => column.trim());
	const cs = new pgp.helpers.ColumnSet(columns);
	const te = new pgp.helpers.TableName({ table, schema });
	
	if(mode == 'normal' || mode == 'transaction') {
		const query = pgp.helpers.insert(getItemsCopy(items, columns), cs, te) +
			(returnFields.length ? ` RETURNING ${returnFields.join(',')}` : '');
		
		if(mode == 'normal') return await db.manyOrNone(query);
		return return db.tx(t => return t.manyOrNone(query));
	} else if(mode == 'independently') {
		const returning = (returnFields.length ? ` RETURNING ${returnFields.join(',')}` : '');
		return db.task(t => {
			const result = [];
			for (let i = 0; i < items.length; i++) {
				try {
					result.push(await t.oneOrNone(pgp.helpers.insert(getItemCopy(items[i]), cs, te) + returning));
				} catch(err) {
					if(continueOnFail === false) throw err;
					result.push({code: err.code, message: err.message});
				}
			}
			return result;
		});
	}
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
	mode: string,
	continueOnFail: boolean,
): Promise<IDataObject[]> {
	const table = getNodeParam('table', 0) as string;
	const schema = getNodeParam('schema', 0) as string;
	const returnFields = ((getNodeParam('returnFields', 0) as string).split(',') as string[])
		.map(value => value.trim()).filter(value => !!value);
	const updateKeys = (getNodeParam('updateKey', 0) as string).split(',').map(column => column.trim());
	const columns = (getNodeParam('columns', 0) as string).split(',').map(column => column.trim());

	const te = new pgp.helpers.TableName({ table, schema });
	
	updateKeys.forEach(updateKey => {
		// Make sure that the updateKey does also get queried
		if (!columns.includes(updateKey)) {
			columns.unshift(updateKey);
		}
	});
	
	if(mode == 'normal' || mode == 'transaction') {
		const query =
			pgp.helpers.update(getItemsCopy(items, columns), columns, te)
			+ ' WHERE ' + updateKeys.map(updateKey => 'v.' + updateKey + ' = t.' + updateKey).join(' AND ')
			+ (returnFields.length ? ` RETURNING ${returnFields.join(',')}` : '');
		if(mode == 'normal') return await db.manyOrNone(query);
		return return db.tx(t => return t.manyOrNone(query));
	} else if(mode == 'independently') {
		const returning = (returnFields.length ? ` RETURNING ${returnFields.join(',')}` : '');
		const where = ' WHERE ' + updateKeys.map(updateKey => 'v.' + updateKey + ' = t.' + updateKey).join(' AND ');
		
		return db.task(t => {
			const result = [];
			for (let i = 0; i < items.length; i++) {
				try {
					result.push(await t.manyOrNone(pgp.helpers.update(getItemCopy(items, columns), columns, te) + where + returning));
				} catch(err) {
					if(continueOnFail === false) throw err;
					result.push({code: err.code, message: err.message});
				}
			}
			return result;
		});
	}
}
