import { createPrivateKey } from 'crypto';
import pick from 'lodash/pick';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type snowflake from 'snowflake-sdk';
import { formatPrivateKey } from '@utils/utilities';

function stripLeadingComments(sqlText: string) {
	let trimmedSql = sqlText.trim();

	while (
		trimmedSql.startsWith('--') ||
		trimmedSql.startsWith('//') ||
		trimmedSql.startsWith('/*')
	) {
		if (trimmedSql.startsWith('--') || trimmedSql.startsWith('//')) {
			const endOfComment = trimmedSql.search(/[\r\n]/);
			if (endOfComment === -1) return '';
			trimmedSql = trimmedSql.slice(endOfComment + 1).trim();
			continue;
		}

		const endOfComment = trimmedSql.indexOf('*/');
		if (endOfComment === -1) return trimmedSql;
		trimmedSql = trimmedSql.slice(endOfComment + 2).trim();
	}

	return trimmedSql;
}

export const isFileTransferQuery = (sqlText: string) => {
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
] as const;

export type SnowflakeCredential = Pick<
	snowflake.ConnectionOptions,
	(typeof commonConnectionFields)[number]
> &
	(
		| {
				authentication: 'password';
				username?: string;
				password?: string;
		  }
		| {
				authentication: 'keyPair';
				username: string;
				privateKey: string;
				passphrase?: string;
		  }
	);

const extractPrivateKey = (credential: { privateKey: string; passphrase?: string }) => {
	const key = formatPrivateKey(credential.privateKey);

	if (!credential.passphrase) return key;

	const privateKeyObject = createPrivateKey({
		key,
		format: 'pem',
		passphrase: credential.passphrase,
	});

	return privateKeyObject.export({
		format: 'pem',
		type: 'pkcs8',
	}) as string;
};

export const getConnectionOptions = (credential: SnowflakeCredential) => {
	const connectionOptions: snowflake.ConnectionOptions = pick(credential, commonConnectionFields);
	if (credential.authentication === 'keyPair') {
		connectionOptions.authenticator = 'SNOWFLAKE_JWT';
		connectionOptions.username = credential.username;
		connectionOptions.privateKey = extractPrivateKey(credential);
	} else {
		connectionOptions.username = credential.username;
		connectionOptions.password = credential.password;
	}
	return connectionOptions;
};

export async function connect(conn: snowflake.Connection) {
	return await new Promise<void>((resolve, reject) => {
		conn.connect((error) => (error ? reject(error) : resolve()));
	});
}

export async function destroy(conn: snowflake.Connection) {
	return await new Promise<void>((resolve, reject) => {
		conn.destroy((error) => (error ? reject(error) : resolve()));
	});
}

export function escapeSnowflakeIdentifier(identifier: string): string {
	if (identifier.startsWith('"') && identifier.endsWith('"') && identifier.length > 2) {
		// Already quoted — preserve case (Snowflake quoted identifiers are case-sensitive)
		const bare = identifier.slice(1, -1).replace(/""/g, '"');
		return `"${bare.replace(/"/g, '""')}"`;
	}
	// Snowflake stores unquoted identifiers as UPPERCASE by default; uppercase for compatibility
	return `"${identifier.toUpperCase().replace(/"/g, '""')}"`;
}

export function escapeSnowflakeObjectIdentifier(identifier: string): string {
	const parts: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < identifier.length; i++) {
		const char = identifier[i];
		if (char === '"') {
			if (inQuotes && identifier[i + 1] === '"') {
				// Escaped double-quote inside a quoted identifier
				current += '""';
				i++;
			} else {
				inQuotes = !inQuotes;
				current += char;
			}
		} else if (char === '.' && !inQuotes) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);

	return parts.map(escapeSnowflakeIdentifier).join('.');
}

export async function execute(
	conn: snowflake.Connection,
	sqlText: string,
	binds: snowflake.Binds,
	node: INode,
	itemIndex?: number,
) {
	if (isFileTransferQuery(sqlText)) {
		throw new NodeOperationError(
			node,
			"Local file access isn't allowed. Remove PUT or GET file operations from the query and try again.",
			{ itemIndex },
		);
	}

	return await new Promise<unknown[] | undefined>((resolve, reject) => {
		conn.execute({
			sqlText,
			binds,
			complete: (error, _, rows) => (error ? reject(error) : resolve(rows)),
		});
	});
}
