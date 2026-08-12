import { formatPemBlock } from '@n8n/utils/format-pem-block';
import get from 'lodash/get';
import set from 'lodash/set';
import { Binary, MongoClient, ObjectId } from 'mongodb';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { createSecureContext } from 'tls';

import { routeBinaryProperties } from '@utils/binary';

import type {
	IMongoCredentials,
	IMongoCredentialsType,
	IMongoParametricCredentials,
} from './mongoDb.types';

/**
 * Standard way of building the MongoDB connection string, unless overridden with a provided string
 *
 * @param {ICredentialDataDecryptedObject} credentials MongoDB credentials to use, unless conn string is overridden
 */
export function buildParameterizedConnString(credentials: IMongoParametricCredentials): string {
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
 * @param {ICredentialDataDecryptedObject} credentials raw/input MongoDB credentials to use
 */
export function buildMongoConnectionParams(
	node: INode,
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
				node,
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
 * @param {ICredentialDataDecryptedObject} credentials raw/input MongoDB credentials to use
 */
export function validateAndResolveMongoCredentials(
	node: INode,
	credentials?: ICredentialDataDecryptedObject,
): IMongoCredentials {
	if (credentials === undefined) {
		throw new NodeOperationError(node, 'No credentials got returned!');
	} else {
		return buildMongoConnectionParams(node, credentials as unknown as IMongoCredentialsType);
	}
}

type MongoQueryParameterScalar = string | number | boolean | bigint | Date | null;
type MongoQueryParameter = MongoQueryParameterScalar | MongoQueryParameterScalar[];

function isScalarValue(value: unknown): value is MongoQueryParameterScalar {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint' ||
		value instanceof Date
	);
}

function parseQueryParameters(
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
): MongoQueryParameter[] {
	let parameters: unknown = rawParameters;

	if (typeof parameters === 'string') {
		try {
			parameters = JSON.parse(parameters) as unknown;
		} catch (error) {
			throw new NodeOperationError(node, error as Error, {
				itemIndex,
				message: 'Query Parameters must be valid JSON',
				description: 'Enter the parameters as a JSON array',
			});
		}
	}

	if (!Array.isArray(parameters)) {
		throw new NodeOperationError(node, 'Query Parameters must be a JSON array', {
			itemIndex,
			description: 'Enter the parameters as a JSON array',
		});
	}

	return parameters.map((parameter, index) => {
		if (isScalarValue(parameter) || (Array.isArray(parameter) && parameter.every(isScalarValue))) {
			return parameter;
		}

		throw new NodeOperationError(
			node,
			`Query parameter ${index + 1} must be a scalar or an array of scalars`,
			{
				itemIndex,
				description: 'Objects and nested arrays are not supported',
			},
		);
	});
}

export function parseAndResolveQueryParameters(
	query: string,
	rawParameters: unknown,
	node: INode,
	itemIndex: number,
): unknown {
	const parsedQuery = jsonParse<unknown>(query);
	const parameters = parseQueryParameters(rawParameters, node, itemIndex);

	if (parameters.length === 0) return parsedQuery;

	const usedParameters = new Set<number>();

	const resolveValue = (value: unknown): unknown => {
		if (typeof value === 'string') {
			const match = /^\$(\d+)$/.exec(value);
			if (!match) return value;

			const parameterIndex = Number(match[1]) - 1;
			if (parameterIndex < 0 || parameterIndex >= parameters.length) {
				throw new NodeOperationError(node, `Query placeholder ${value} has no matching value`, {
					itemIndex,
					description: `Add a value for ${value} to Query Parameters`,
				});
			}

			usedParameters.add(parameterIndex);
			return parameters[parameterIndex];
		}

		if (Array.isArray(value)) return value.map(resolveValue);

		if (value !== null && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([key, entry]) => [key, resolveValue(entry)]),
			);
		}

		return value;
	};

	const resolvedQuery = resolveValue(parsedQuery);
	const unusedParameter = parameters.findIndex((_, index) => !usedParameters.has(index));

	if (unusedParameter !== -1) {
		throw new NodeOperationError(node, `Query parameter ${unusedParameter + 1} is not used`, {
			itemIndex,
			description: `Add $${unusedParameter + 1} to the query or remove the unused parameter`,
		});
	}

	return resolvedQuery;
}

function describeUpdateKeyValueType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (value instanceof Date) return 'date';
	return typeof value;
}

export function prepareItems({
	items,
	fields,
	updateKey = '',
	useDotNotation = false,
	dateFields = [],
	isUpdate = false,
	node,
}: {
	items: INodeExecutionData[];
	fields: string[];
	updateKey?: string;
	useDotNotation?: boolean;
	dateFields?: string[];
	isUpdate?: boolean;
	node: INode;
}) {
	let data = items;

	if (updateKey) {
		if (!fields.includes(updateKey)) {
			fields.push(updateKey);
		}
		data = items.filter((item) => item.json[updateKey] !== undefined);
	}

	const preparedItems = data.map(({ json }, itemIndex) => {
		const updateItem: IDataObject = {};

		for (const field of fields) {
			let fieldData;

			if (useDotNotation) {
				fieldData = get(json, field, null);
			} else {
				fieldData = json[field] !== undefined ? json[field] : null;
			}

			if (fieldData && dateFields.includes(field)) {
				fieldData = new Date(fieldData as string);
			}

			if (field === updateKey && !isScalarValue(fieldData)) {
				throw new NodeOperationError(
					node,
					`The value of "${updateKey}" must be a string, number, boolean, or date`,
					{
						itemIndex,
						description: `Got ${describeUpdateKeyValueType(fieldData)} instead. Objects and arrays are not allowed as the match value.`,
					},
				);
			}

			if (useDotNotation && !isUpdate) {
				set(updateItem, field, fieldData);
			} else {
				updateItem[field] = fieldData;
			}
		}

		return updateItem;
	});

	return preparedItems;
}

export function prepareFields(fields: string) {
	return fields
		.split(',')
		.map((field) => field.trim())
		.filter((field) => !!field);
}

export function stringifyObjectIDs(items: INodeExecutionData[]) {
	items.forEach((item) => {
		if (item._id instanceof ObjectId) {
			item.json._id = item._id.toString();
		}
		if (item.id instanceof ObjectId) {
			item.json.id = item.id.toString();
		}
	});

	return items;
}

const mongoValueToBuffer = (value: unknown): Buffer | undefined => {
	if (value instanceof Binary) return Buffer.from(value.buffer);
	if (Buffer.isBuffer(value)) return value;
	return undefined;
};

// v1.4+: move top-level binary fields to the item's binary output, and deep-serialize
// the remaining document so nested ObjectIds/Dates become JSON-safe (hex/ISO) strings.
// (Deeply-nested binary values still serialize to base64 within json.)
export async function serializeMongoItems(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return await Promise.all(
		items.map(async (item) => {
			const { json, binary: routed } = await routeBinaryProperties.call(
				this,
				item.json,
				mongoValueToBuffer,
			);

			const result: INodeExecutionData = { ...item, json };
			if (item.binary !== undefined || Object.keys(routed).length) {
				result.binary = { ...(item.binary ?? {}), ...routed };
			}
			return result;
		}),
	);
}

export async function connectMongoClient(
	connectionString: string,
	nodeVersion: number,
	credentials: IDataObject = {},
) {
	let client: MongoClient;
	const driverInfo = {
		name: 'n8n_crud',
		version: nodeVersion > 0 ? nodeVersion.toString() : 'unknown',
	};

	if (credentials.tls) {
		const ca = credentials.ca ? formatPemBlock(credentials.ca as string) : undefined;
		const cert = credentials.cert ? formatPemBlock(credentials.cert as string) : undefined;
		const key = credentials.key ? formatPemBlock(credentials.key as string) : undefined;
		const passphrase = (credentials.passphrase as string) || undefined;

		const secureContext = createSecureContext({
			ca,
			cert,
			key,
			passphrase,
		});

		client = await MongoClient.connect(connectionString, {
			tls: true,
			secureContext,
			driverInfo,
		});
	} else {
		client = await MongoClient.connect(connectionString, { driverInfo });
	}
	return client;
}
