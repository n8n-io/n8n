import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import pgPromise = require('pg-promise');
import pg = require('pg-promise/typescript/pg-subset');

/**
 * Executes the given SQL query on the database.
 *
 * @param {Function} getNodeParam The getter of the Node
 * @param {pgPromise.IMain<{}, pg.IClient>} pgp The pgPromise instance
 * @param {pgPromise.IDatabase<{}, pg.IClient>} db The pgPromise database connection
 * @param {input[]} input The Node's input data
 * @returns Promise<any>
 */
export function executeQuery(
	getNodeParam: Function,
	pgp: pgPromise.IMain<{}, pg.IClient>,
	db: pgPromise.IDatabase<{}, pg.IClient>,
	input: INodeExecutionData[]
): Promise<any> {
	const queries: string[] = [];
	for (let i = 0; i < input.length; i++) {
		queries.push(getNodeParam('query', i) as string);
	}

	return db.any(pgp.helpers.concat(queries));
}

// /**
//  * Returns of copy of the items which only contains the json data and
//  * of that only the define properties
//  *
//  * @param {items[]} items The items execute the query with
//  * @param {string[]} properties The properties it should include
//  * @returns
//  */
// export function insert(
// 	getNodeParam: Function,
// 	pgp: pgPromise.IMain<{}, pg.IClient>,
// 	db: pgPromise.IDatabase<{}, pg.IClient>,
// 	items: INodeExecutionData[]
// ): Promise<any> {
// 	const queries: string[] = [];
// 	for (let i = 0; i < items.length; i++) {
// 		queries.push(getNodeParam('query', i) as string);
// 	}

// 	return db.any(pgp.helpers.concat(queries));
// }
