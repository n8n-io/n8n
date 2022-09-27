import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
import pgPromise from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';

/**
 * Returns of a shallow copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function getItemsCopy(
	items: INodeExecutionData[],
	properties: string[],
	guardedColumns?: { [key: string]: string },
): IDataObject[] {
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		if (guardedColumns) {
			Object.keys(guardedColumns).forEach((column) => {
				newItem[column] = item.json[guardedColumns[column]];
			});
		} else {
			for (const property of properties) {
				newItem[property] = item.json[property];
			}
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
export function getItemCopy(
	item: INodeExecutionData,
	properties: string[],
	guardedColumns?: { [key: string]: string },
): IDataObject {
	const newItem: IDataObject = {};
	if (guardedColumns) {
		Object.keys(guardedColumns).forEach((column) => {
			newItem[column] = item.json[guardedColumns[column]];
		});
	} else {
		for (const property of properties) {
			newItem[property] = item.json[property];
		}
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
	return (
		' RETURNING ' +
		returning
			.split(',')
			.map((returnedField) => pgp.as.name(returnedField.trim()))
			.join(', ')
	);
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
		const properties = propertiesString.split(',').map((column) => column.trim());
		const paramsItems = getItemsCopy(items, properties);
		valuesArray = paramsItems.map((row) => properties.map((col) => row[col])) as string[][];
	}

	const allQueries = [] as Array<{ query: string; values?: string[] }>;
	for (let i = 0; i < items.length; i++) {
		const query = getNodeParam('query', i) as string;
		const values = valuesArray[i];
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);
	if (mode === 'multiple') {
		return (await db.multi(pgp.helpers.concat(allQueries))).flat(1);
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					Array.prototype.push.apply(
						result,
						await t.any(allQueries[i].query, allQueries[i].values),
					);
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						...items[i].json,
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
					});
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					Array.prototype.push.apply(
						result,
						await t.any(allQueries[i].query, allQueries[i].values),
					);
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						...items[i].json,
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
					});
				}
			}
			return result;
		});
	}
	throw new Error('multiple, independently or transaction are valid options');
}

export async function pgQueryV2(
	this: IExecuteFunctions,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail: boolean,
	overrideMode?: string,
): Promise<IDataObject[]> {
	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

	let valuesArray = [] as string[][];
	if (additionalFields.queryParams) {
		const propertiesString = additionalFields.queryParams as string;
		const properties = propertiesString.split(',').map((column) => column.trim());
		const paramsItems = getItemsCopy(items, properties);
		valuesArray = paramsItems.map((row) => properties.map((col) => row[col])) as string[][];
	}

	type QueryWithValues = { query: string; values?: string[] };
	const allQueries = new Array<QueryWithValues>();
	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;
		const values = valuesArray[i];
		const queryFormat = { query, values };
		allQueries.push(queryFormat);
	}

	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);
	if (mode === 'multiple') {
		return (await db.multi(pgp.helpers.concat(allQueries)))
			.map((result, i) => {
				return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
					itemData: { item: i },
				});
			})
			.flat();
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					const transactionResult = await t.any(allQueries[i].query, allQueries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(transactionResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						json: { ...items[i].json },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < allQueries.length; i++) {
				try {
					const transactionResult = await t.any(allQueries[i].query, allQueries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(transactionResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						json: { ...items[i].json },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
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
	const guardedColumns: { [key: string]: string } = {};

	const columns = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const columnNames = columns.map((column) => column.name);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	const additionalFields = getNodeParam('additionalFields', 0) as IDataObject;
	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);

	const returning = generateReturning(pgp, getNodeParam('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.insert(getItemsCopy(items, columnNames, guardedColumns), cs) + returning;
		return db.any(query);
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					result.push(await t.one(pgp.helpers.insert(itemCopy, cs) + returning));
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						...itemCopy,
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
					});
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.oneOrNone(pgp.helpers.insert(itemCopy, cs) + returning);
					if (insertResult !== null) {
						result.push(insertResult);
					}
				} catch (err) {
					if (continueOnFail === false) {
						throw err;
					}
					result.push({
						...itemCopy,
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
					});
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
export async function pgInsertV2(
	this: IExecuteFunctions,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail: boolean,
	overrideMode?: string,
): Promise<IDataObject[]> {
	const table = this.getNodeParameter('table', 0) as string;
	const schema = this.getNodeParameter('schema', 0) as string;
	const columnString = this.getNodeParameter('columns', 0) as string;
	const guardedColumns: { [key: string]: string } = {};

	const columns = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const columnNames = columns.map((column) => column.name);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);

	const returning = generateReturning(pgp, this.getNodeParameter('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.insert(getItemsCopy(items, columnNames, guardedColumns), cs) + returning;
		const queryResult = await db.any(query);
		return queryResult.map((result, i) => {
				return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
					itemData: { item: i },
				});
			})
			.flat();
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.one(pgp.helpers.insert(itemCopy, cs) + returning);
					result.push(
						...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(insertResult), {
							itemData: { item: i },
						}),
					);
				} catch (err) {
					if (continueOnFail === false) throw err;
					result.push({
						json: { ...itemCopy },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.oneOrNone(pgp.helpers.insert(itemCopy, cs) + returning);
					if (insertResult !== null) {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(insertResult),
							{ itemData: { item: i } },
						);
						result.push(...executionData);
					}
				} catch (err) {
					if (continueOnFail === false) {
						throw err;
					}
					result.push({
						json: { ...itemCopy },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
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
	const guardedColumns: { [key: string]: string } = {};

	const columns: Array<{ name: string; cast: string; prop: string }> = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const updateKeys = updateKey.split(',').map((key, i) => {
		const [name, cast] = key.trim().split(':');
		const targetCol = columns.find((column) => column.name === name);
		const updateColumn = { name, cast, prop: targetCol ? targetCol.prop : `updateColumn${i}` };
		if (!targetCol) {
			guardedColumns[updateColumn.prop] = name;
			columns.unshift(updateColumn);
		} else if (!targetCol.cast) {
			targetCol.cast = updateColumn.cast || targetCol.cast;
		}
		return updateColumn;
	});

	const additionalFields = getNodeParam('additionalFields', 0) as IDataObject;
	const mode = additionalFields.mode ?? ('multiple' as string);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	// Prepare the data to update and copy it to be returned
	const columnNames = columns.map((column) => column.name);
	const updateItems = getItemsCopy(items, columnNames, guardedColumns);

	const returning = generateReturning(pgp, getNodeParam('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.update(updateItems, cs) +
			' WHERE ' +
			updateKeys
				.map((updateKey) => {
					const key = pgp.as.name(updateKey.name);
					return 'v.' + key + ' = t.' + key;
				})
				.join(' AND ') +
			returning;
		return await db.any(query);
	} else {
		const where =
			' WHERE ' +
			updateKeys
				.map((updateKey) => pgp.as.name(updateKey.name) + ' = ${' + updateKey.prop + '}')
				.join(' AND ');
		if (mode === 'transaction') {
			return db.tx(async (t) => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
					try {
						Array.prototype.push.apply(
							result,
							await t.any(
								pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning,
							),
						);
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({
							...itemCopy,
							code: (err as JsonObject).code,
							message: (err as JsonObject).message,
						});
						return result;
					}
				}
				return result;
			});
		} else if (mode === 'independently') {
			return db.task(async (t) => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
					try {
						Array.prototype.push.apply(
							result,
							await t.any(
								pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning,
							),
						);
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({
							...itemCopy,
							code: (err as JsonObject).code,
							message: (err as JsonObject).message,
						});
					}
				}
				return result;
			});
		}
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
export async function pgUpdateV2(
	this: IExecuteFunctions,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	items: INodeExecutionData[],
	continueOnFail = false,
): Promise<IDataObject[]> {
	const table = this.getNodeParameter('table', 0) as string;
	const schema = this.getNodeParameter('schema', 0) as string;
	const updateKey = this.getNodeParameter('updateKey', 0) as string;
	const columnString = this.getNodeParameter('columns', 0) as string;
	const guardedColumns: { [key: string]: string } = {};

	const columns: Array<{ name: string; cast: string; prop: string }> = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const updateKeys = updateKey.split(',').map((key, i) => {
		const [name, cast] = key.trim().split(':');
		const targetCol = columns.find((column) => column.name === name);
		const updateColumn = { name, cast, prop: targetCol ? targetCol.prop : `updateColumn${i}` };
		if (!targetCol) {
			guardedColumns[updateColumn.prop] = name;
			columns.unshift(updateColumn);
		} else if (!targetCol.cast) {
			targetCol.cast = updateColumn.cast || targetCol.cast;
		}
		return updateColumn;
	});

	const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
	const mode = additionalFields.mode ?? ('multiple' as string);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	// Prepare the data to update and copy it to be returned
	const columnNames = columns.map((column) => column.name);
	const updateItems = getItemsCopy(items, columnNames, guardedColumns);

	const returning = generateReturning(pgp, this.getNodeParameter('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.update(updateItems, cs) +
			' WHERE ' +
			updateKeys
				.map((updateKey) => {
					const key = pgp.as.name(updateKey.name);
					return 'v.' + key + ' = t.' + key;
				})
				.join(' AND ') +
			returning;
		const updateResult = await db.any(query);
		return updateResult;
	} else {
		const where =
			' WHERE ' +
			updateKeys
				.map((updateKey) => pgp.as.name(updateKey.name) + ' = ${' + updateKey.prop + '}')
				.join(' AND ');
		if (mode === 'transaction') {
			return db.tx(async (t) => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
					try {
						const transactionResult = await t.any(
							pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(transactionResult),
							{ itemData: { item: i } },
						);
						result.push(...executionData);
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({
							...itemCopy,
							code: (err as JsonObject).code,
							message: (err as JsonObject).message,
						});
						return result;
					}
				}
				return result;
			});
		} else if (mode === 'independently') {
			return db.task(async (t) => {
				const result: IDataObject[] = [];
				for (let i = 0; i < items.length; i++) {
					const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
					try {
						const independentResult = await t.any(
							pgp.helpers.update(itemCopy, cs) + pgp.as.format(where, itemCopy) + returning,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(independentResult),
							{ itemData: { item: i } },
						);
						result.push(...executionData);
					} catch (err) {
						if (continueOnFail === false) throw err;
						result.push({
							json: { ...items[i].json },
							code: (err as JsonObject).code,
							message: (err as JsonObject).message,
							pairedItem: { item: i },
						} as INodeExecutionData);
					}
				}
				return result;
			});
		}
	}
	throw new Error('multiple, independently or transaction are valid options');
}
