import { 
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import {
	IMongoCredentials,
	IMongoCredentialsType,
	IMongoParametricCredentials,
} from './mongo.node.types';

import {
	get,
	set,
} from 'lodash';

/**
 * Standard way of building the MongoDB connection string, unless overridden with a provided string
 *
 * @param {ICredentialDataDecryptedObject} credentials MongoDB credentials to use, unless conn string is overridden
 */
function buildParameterizedConnString(
	credentials: IMongoParametricCredentials,
): string {
	if (credentials.port) {
		return `mongodb://${credentials.user}:${credentials.password}@${credentials.host}:${credentials.port}`;
	} else {
		return `mongodb+srv://${credentials.user}:${credentials.password}@${credentials.host}`;
	}
}

/**
 * Build mongoDb connection string and resolve database name.
 * If a connection string override value is provided, that will be used in place of individual args
 *
 * @param {IExecuteFunctions} self
 * @param {ICredentialDataDecryptedObject} credentials raw/input MongoDB credentials to use
 */
export function buildMongoConnectionParams(
	self: IExecuteFunctions,
	credentials: IMongoCredentialsType,
): IMongoCredentials {
	const sanitizedDbName =
		credentials.database && credentials.database.trim().length > 0
			? credentials.database.trim()
			: '';
	if (credentials.configurationType === 'connectionString') {
		if (
			credentials.connectionString &&
			credentials.connectionString.trim().length > 0
		) {
			return {
				connectionString: credentials.connectionString.trim(),
				database: sanitizedDbName,
			};
		} else {
			throw new NodeOperationError(self.getNode(), 'Cannot override credentials: valid MongoDB connection string not provided ');
		}
	} else {
		return {
			connectionString: buildParameterizedConnString(credentials),
			database: sanitizedDbName,
		};
	}
}

/**
 * Verify credentials. If ok, build mongoDb connection string and resolve database name.
 *
 * @param {IExecuteFunctions} self
 * @param {ICredentialDataDecryptedObject} credentials raw/input MongoDB credentials to use
 */
export function validateAndResolveMongoCredentials(
	self: IExecuteFunctions,
	credentials?: ICredentialDataDecryptedObject,
): IMongoCredentials {
	if (credentials === undefined) {
		throw new NodeOperationError(self.getNode(), 'No credentials got returned!');
	} else {
		return buildMongoConnectionParams(
			self,
			credentials as unknown as IMongoCredentialsType,
		);
	}
}

/**
 * Returns of copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 * @returns
 */
export function getItemCopy(
	items: INodeExecutionData[],
	properties: string[],
	dotNotation: boolean,
): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map(item => {
		newItem = {};
		for (const property of properties) {
			if (dotNotation === false) {
				if (item.json[property] === undefined) {
					newItem[property] = null;
				} else {
					newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
				}
			} else {
				let writeTo = property;
				let readFrom = property;
				if (property.includes(':')) {
					writeTo = property.split(':').pop() as string;
					readFrom = property.split(':').shift() as string;
				}
				if (get(item.json, readFrom) === undefined) {
					set(item.json, readFrom, null);
				} else {
					set(newItem, writeTo, JSON.parse(JSON.stringify(get(item.json, readFrom))));
				}
			}
		}
		return newItem;
	});
}

export function handleDateFields(insertItems: IDataObject[], fields: string, dotNotation: boolean) {
	const dateFields = (fields as string).split(',');
	for (let i = 0; i < insertItems.length; i++) {
		for (const field of dateFields) {
			if (dotNotation) {
				if (get(insertItems[i], field) !== undefined) {
					set(insertItems[i], field, new Date(get(insertItems[i], field) as string));
				}
			} else {
				if (insertItems[i][field] !== undefined) {
					insertItems[i][field] = new Date(insertItems[i][field] as string);
				}
			}
		}
	}
}
