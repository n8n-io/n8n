import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, ILoadOptionsFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import pgPromise from 'pg-promise';
import type { PgpClient, WhereClause } from './interfaces';

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

export function generateReturning(pgp: PgpClient, returning: string): string {
	return (
		' RETURNING ' +
		returning
			.split(',')
			.map((returnedField) => pgp.as.name(returnedField.trim()))
			.join(', ')
	);
}

export function wrapData(data: IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export async function configurePostgres(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('postgres');
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const pgp = pgPromise();

	if (options.largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const config: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (options.connectionTimeoutMillis) {
		config.connectionTimeoutMillis = options.connectionTimeoutMillis as number;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		config.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		config.sslmode = (credentials.ssl as string) || 'disable';
	}

	const db = pgp(config);
	return { db, pgp };
}

export function prepareErrorItem(
	items: INodeExecutionData[],
	error: IDataObject | NodeOperationError | Error,
	index: number,
) {
	return {
		json: { message: error.message, item: { ...items[index].json }, error: { ...error } },
		pairedItem: { item: index },
	} as INodeExecutionData;
}

export function parsePostgresError(this: IExecuteFunctions, error: any, itemIndex?: number) {
	let message = error.message;
	const description = error.description ? error.description : error.detail || error.hint;

	if ((error?.message as string).includes('ECONNREFUSED')) {
		message = 'Connection refused';
	}

	return new NodeOperationError(this.getNode(), error as Error, {
		message,
		description,
		itemIndex,
	});
}

export function prepareWhereClauses(clauses: WhereClause[]) {
	console.log('prepareWhereClauses', clauses);
	const query = '';
	const values: string[] = [];
	return [query, values];
}
