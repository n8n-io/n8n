import { formatPemBlock } from '@n8n/utils/format-pem-block';
import get from 'lodash/get';
import set from 'lodash/set';
import { Binary, MongoClient, ObjectId } from 'mongodb';
import { NodeOperationError } from 'n8n-workflow';
import { createSecureContext } from 'tls';
import { routeBinaryProperties } from '@utils/binary';
import { isScalarValue } from '@utils/query-parameters';
export function sanitizeMongoUriInMessage(error, connectionString) {
    const message = error instanceof Error ? error.message : String(error);
    if (connectionString) {
        const scheme = /^mongodb(?:\+srv)?:\/\//i.exec(connectionString)?.[0] ?? '';
        const sanitizedMessage = message.replaceAll(connectionString, `${scheme}[REDACTED]`);
        if (sanitizedMessage !== message)
            return sanitizedMessage;
    }
    return message.replace(/mongodb(\+srv)?:\/\/(?=[^\s]*@)[^\s]+/gi, 'mongodb$1://[REDACTED]');
}
/**
 * Standard way of building the MongoDB connection string, unless overridden with a provided string
 *
 * @param {ICredentialDataDecryptedObject} credentials MongoDB credentials to use, unless conn string is overridden
 */
export function buildParameterizedConnString(credentials) {
    const user = (credentials.user ?? '').trim();
    const host = (credentials.host ?? '').trim();
    if (credentials.port) {
        return `mongodb://${user}:${credentials.password}@${host}:${credentials.port}`;
    }
    else {
        return `mongodb+srv://${user}:${credentials.password}@${host}`;
    }
}
/**
 * Build mongoDb connection string and resolve database name.
 * If a connection string override value is provided, that will be used in place of individual args
 *
 * @param {ICredentialDataDecryptedObject} credentials raw/input MongoDB credentials to use
 */
export function buildMongoConnectionParams(node, credentials) {
    const sanitizedDbName = credentials.database && credentials.database.trim().length > 0
        ? credentials.database.trim()
        : '';
    if (credentials.configurationType === 'connectionString') {
        if (credentials.connectionString && credentials.connectionString.trim().length > 0) {
            return {
                connectionString: credentials.connectionString.trim(),
                database: sanitizedDbName,
            };
        }
        else {
            throw new NodeOperationError(node, 'Cannot override credentials: valid MongoDB connection string not provided ');
        }
    }
    else {
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
export function validateAndResolveMongoCredentials(node, credentials) {
    if (credentials === undefined) {
        throw new NodeOperationError(node, 'No credentials got returned!');
    }
    else {
        return buildMongoConnectionParams(node, credentials);
    }
}
function describeUpdateKeyValueType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    if (value instanceof Date)
        return 'date';
    return typeof value;
}
export function prepareItems({ items, fields, updateKey = '', useDotNotation = false, dateFields = [], isUpdate = false, node, }) {
    let data = items;
    if (updateKey) {
        if (!fields.includes(updateKey)) {
            fields.push(updateKey);
        }
        data = items.filter((item) => item.json[updateKey] !== undefined);
    }
    const preparedItems = data.map(({ json }, itemIndex) => {
        const updateItem = {};
        for (const field of fields) {
            let fieldData;
            if (useDotNotation) {
                fieldData = get(json, field, null);
            }
            else {
                fieldData = json[field] !== undefined ? json[field] : null;
            }
            if (fieldData && dateFields.includes(field)) {
                fieldData = new Date(fieldData);
            }
            if (field === updateKey && !isScalarValue(fieldData)) {
                throw new NodeOperationError(node, `The value of "${updateKey}" must be a string, number, boolean, or date`, {
                    itemIndex,
                    description: `Got ${describeUpdateKeyValueType(fieldData)} instead. Objects and arrays are not allowed as the match value.`,
                });
            }
            if (useDotNotation && !isUpdate) {
                set(updateItem, field, fieldData);
            }
            else {
                updateItem[field] = fieldData;
            }
        }
        return updateItem;
    });
    return preparedItems;
}
export function prepareFields(fields) {
    return fields
        .split(',')
        .map((field) => field.trim())
        .filter((field) => !!field);
}
export function stringifyObjectIDs(items) {
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
const mongoValueToBuffer = (value) => {
    if (value instanceof Binary)
        return Buffer.from(value.buffer);
    if (Buffer.isBuffer(value))
        return value;
    return undefined;
};
// v1.4+: move top-level binary fields to the item's binary output, and deep-serialize
// the remaining document so nested ObjectIds/Dates become JSON-safe (hex/ISO) strings.
// (Deeply-nested binary values still serialize to base64 within json.)
export async function serializeMongoItems(items) {
    return await Promise.all(items.map(async (item) => {
        const { json, binary: routed } = await routeBinaryProperties.call(this, item.json, mongoValueToBuffer);
        const result = { ...item, json };
        if (item.binary !== undefined || Object.keys(routed).length) {
            result.binary = { ...(item.binary ?? {}), ...routed };
        }
        return result;
    }));
}
export async function connectMongoClient(connectionString, nodeVersion, credentials = {}) {
    let client;
    const driverInfo = {
        name: 'n8n_crud',
        version: nodeVersion > 0 ? nodeVersion.toString() : 'unknown',
    };
    if (credentials.tls) {
        const ca = credentials.ca ? formatPemBlock(credentials.ca) : undefined;
        const cert = credentials.cert ? formatPemBlock(credentials.cert) : undefined;
        const key = credentials.key ? formatPemBlock(credentials.key) : undefined;
        const passphrase = credentials.passphrase || undefined;
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
    }
    else {
        client = await MongoClient.connect(connectionString, { driverInfo });
    }
    return client;
}
//# sourceMappingURL=GenericFunctions.js.map