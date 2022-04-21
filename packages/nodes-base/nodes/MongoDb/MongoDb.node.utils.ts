import { ObjectId } from 'mongodb';
import {IExecuteFunctions, ITriggerFunctions} from 'n8n-core';

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
} from './MongoDb.node.types';

/**
 * Standard way of building the MongoDB connection string, unless overridden with a provided string
 *
 * @param {ICredentialDataDecryptedObject} credentials MongoDB credentials to use, unless conn string is overridden
 */
function buildParameterizedConnString(credentials: IMongoParametricCredentials): string {
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
	self: IExecuteFunctions | ITriggerFunctions,
	credentials: IMongoCredentialsType,
): IMongoCredentials {
	const sanitizedDbName =
		credentials.database && credentials.database.trim().length > 0
			? credentials.database.trim()
			: '';
	if (credentials.configurationType === 'connectionString') {
		if (credentials.connectionString && credentials.connectionString.trim().length > 0) {
			return {
				connectionString: credentials.connectionString.trim(),
				database: sanitizedDbName,
			};
		} else {
			throw new NodeOperationError(
				self.getNode(),
				'Cannot override credentials: valid MongoDB connection string not provided ',
			);
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
	self: IExecuteFunctions | ITriggerFunctions,
	credentials?: ICredentialDataDecryptedObject,
): IMongoCredentials {
	if (credentials === undefined) {
		throw new NodeOperationError(self.getNode(), 'No credentials got returned!');
	} else {
		return buildMongoConnectionParams(self, credentials as unknown as IMongoCredentialsType);
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
export function getItemCopy(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;

	return items.map((item) => {
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

export function handleDateFields(insertItems: IDataObject[], fields: string) {
	const dateFields = (fields as string).split(',');

	for (let i = 0; i < insertItems.length; i++) {
		for (const key of Object.keys(insertItems[i])) {
			if (dateFields.includes(key)) {
				if (!insertItems[i][key]) continue;
				insertItems[i][key] = new Date(insertItems[i][key] as string);
			}
		}
	}
}

export function handleObjectIdFields(items: IDataObject[], fields: string) {
	// const objectIdFields = (fields as string).split(',');

	for (let i = 0; i < items.length; i++) {
		handleObjectId(items[i], fields);
	}
}

export function handleObjectId(item: Record<string, any>, fields: string) { // tslint:disable-line:no-any
	const objectIdFields = (fields as string).split(',');

	for (const key of Object.keys(item)) {
		if (objectIdFields.includes(key)) {
			if (!item[key]) continue;

			if (item[key].$in && Array.isArray(item[key].$in)) {
				item[key].$in = item[key].$in.map((id: string) => {
					return new ObjectId(id);
				});

				continue;
			}

			if (Array.isArray(item[key])) {
				const ids = item[key] || [];

				item[key] = ids.map((id: string) => {
					return new ObjectId(id);
				});

				continue;
			}

			item[key] = new ObjectId(item[key]);
		}
	}
}
