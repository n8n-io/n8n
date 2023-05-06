import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import type snowflake from 'snowflake-sdk';

export async function connect(conn: snowflake.Connection) {
	return new Promise((resolve, reject) => {
		conn.connect((err, _conn) => {
			if (!err) {
				// @ts-ignore
				resolve();
			} else {
				reject(err);
			}
		});
	});
}

export async function destroy(conn: snowflake.Connection) {
	return new Promise((resolve, reject) => {
		conn.destroy((err, _conn) => {
			if (!err) {
				// @ts-ignore
				resolve();
			} else {
				reject(err);
			}
		});
	});
}

export async function execute(
	conn: snowflake.Connection,
	sqlText: string,
	binds: snowflake.InsertBinds,
) {
	return new Promise((resolve, reject) => {
		conn.execute({
			sqlText,
			binds,
			complete: (err, stmt, rows) => {
				if (!err) {
					resolve(rows);
				} else {
					reject(err);
				}
			},
		});
	});
}

export function copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = deepCopy(item.json[property]);
			}
		}
		return newItem;
	});
}
