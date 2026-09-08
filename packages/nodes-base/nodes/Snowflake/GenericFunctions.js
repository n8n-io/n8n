import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { createPrivateKey } from 'crypto';
import pick from 'lodash/pick';
import { NodeOperationError } from 'n8n-workflow';
import { routeBinaryProperties } from '@utils/binary';
function stripLeadingComments(sqlText) {
    let trimmedSql = sqlText.trim();
    while (trimmedSql.startsWith('--') ||
        trimmedSql.startsWith('//') ||
        trimmedSql.startsWith('/*')) {
        if (trimmedSql.startsWith('--') || trimmedSql.startsWith('//')) {
            const endOfComment = trimmedSql.search(/[\r\n]/);
            if (endOfComment === -1)
                return '';
            trimmedSql = trimmedSql.slice(endOfComment + 1).trim();
            continue;
        }
        const endOfComment = trimmedSql.indexOf('*/');
        if (endOfComment === -1)
            return trimmedSql;
        trimmedSql = trimmedSql.slice(endOfComment + 2).trim();
    }
    return trimmedSql;
}
export const isFileTransferQuery = (sqlText) => {
    const command = stripLeadingComments(sqlText).slice(0, 3).toUpperCase();
    return command === 'GET' || command === 'PUT';
};
const commonConnectionFields = [
    'account',
    'database',
    'schema',
    'warehouse',
    'role',
    'clientSessionKeepAlive',
];
const extractPrivateKey = (credential) => {
    const key = formatPemBlock(credential.privateKey);
    if (!credential.passphrase)
        return key;
    const privateKeyObject = createPrivateKey({
        key,
        format: 'pem',
        passphrase: credential.passphrase,
    });
    return privateKeyObject.export({
        format: 'pem',
        type: 'pkcs8',
    });
};
export const getConnectionOptions = (credential, nodeVersion) => {
    const connectionOptions = pick(credential, commonConnectionFields);
    if (typeof nodeVersion === 'number' && nodeVersion >= 1.1) {
        // Return DATE/TIME/TIMESTAMP columns as strings so node output stays JSON-safe
        connectionOptions.fetchAsString = ['Date'];
    }
    // Keep host out of commonConnectionFields so blank values can be trimmed and skipped.
    const originHostname = credential.host?.trim();
    if (originHostname) {
        connectionOptions.host = originHostname;
    }
    if (credential.authentication === 'keyPair') {
        connectionOptions.authenticator = 'SNOWFLAKE_JWT';
        connectionOptions.username = credential.username;
        connectionOptions.privateKey = extractPrivateKey(credential);
    }
    else if (credential.authentication === 'oauth2') {
        connectionOptions.authenticator = 'OAUTH';
        connectionOptions.token = credential.token;
    }
    else {
        connectionOptions.username = credential.username;
        connectionOptions.password = credential.password;
    }
    return connectionOptions;
};
export async function connect(conn) {
    return await new Promise((resolve, reject) => {
        conn.connect((error) => (error ? reject(error) : resolve()));
    });
}
export async function destroy(conn) {
    return await new Promise((resolve, reject) => {
        conn.destroy((error) => (error ? reject(error) : resolve()));
    });
}
export function escapeSnowflakeIdentifier(identifier) {
    if (identifier.startsWith('"') && identifier.endsWith('"') && identifier.length > 2) {
        // Already quoted — preserve case (Snowflake quoted identifiers are case-sensitive)
        const bare = identifier.slice(1, -1).replace(/""/g, '"');
        return `"${bare.replace(/"/g, '""')}"`;
    }
    // Snowflake stores unquoted identifiers as UPPERCASE by default; uppercase for compatibility
    return `"${identifier.toUpperCase().replace(/"/g, '""')}"`;
}
export function escapeSnowflakeObjectIdentifier(identifier) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < identifier.length; i++) {
        const char = identifier[i];
        if (char === '"') {
            if (inQuotes && identifier[i + 1] === '"') {
                // Escaped double-quote inside a quoted identifier
                current += '""';
                i++;
            }
            else {
                inQuotes = !inQuotes;
                current += char;
            }
        }
        else if (char === '.' && !inQuotes) {
            parts.push(current);
            current = '';
        }
        else {
            current += char;
        }
    }
    parts.push(current);
    return parts.map(escapeSnowflakeIdentifier).join('.');
}
export async function execute(conn, sqlText, binds, node, itemIndex) {
    if (isFileTransferQuery(sqlText)) {
        throw new NodeOperationError(node, "Local file access isn't allowed. Remove PUT or GET file operations from the query and try again.", { itemIndex });
    }
    return await new Promise((resolve, reject) => {
        conn.execute({
            sqlText,
            binds,
            complete: (error, _, rows) => (error ? reject(error) : resolve(rows)),
        });
    });
}
export async function prepareQueryResults(rows, itemIndex, nodeVersion) {
    if (nodeVersion < 1.1) {
        return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(rows), { itemData: { item: itemIndex } });
    }
    const returnData = [];
    for (const row of rows ?? []) {
        // BINARY columns arrive as Buffers; route them to the item's binary output
        const { json, binary } = await routeBinaryProperties.call(this, row);
        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(json), { itemData: { item: itemIndex } });
        for (const entry of executionData) {
            if (Object.keys(binary).length) {
                entry.binary = binary;
            }
            returnData.push(entry);
        }
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map