import { Client } from 'ldapts';
import type { ClientOptions, Entry } from 'ldapts';
import type { ICredentialDataDecryptedObject, IDataObject, Logger } from 'n8n-workflow';

import { getResolvables } from '@utils/utilities';

export const BINARY_AD_ATTRIBUTES = ['objectGUID', 'objectSid'];

const resolveEntryBinaryAttributes = (entry: Entry): Entry => {
	Object.entries(entry)
		.filter(([k]) => BINARY_AD_ATTRIBUTES.includes(k))
		.forEach(([k]) => {
			entry[k] = (entry[k] as Buffer).toString('hex');
		});
	return entry;
};

export const resolveBinaryAttributes = (entries: Entry[]): void => {
	entries.forEach((entry) => resolveEntryBinaryAttributes(entry));
};

export async function createLdapClient(
	context: { logger: Logger },
	credentials: ICredentialDataDecryptedObject,
	nodeDebug?: boolean,
	nodeType?: string,
	nodeName?: string,
): Promise<Client> {
	const protocol = credentials.connectionSecurity === 'tls' ? 'ldaps' : 'ldap';
	const url = `${protocol}://${credentials.hostname}:${credentials.port}`;

	const ldapOptions: ClientOptions = { url };
	const tlsOptions: IDataObject = {};

	if (credentials.connectionSecurity !== 'none') {
		tlsOptions.rejectUnauthorized = credentials.allowUnauthorizedCerts === false;
		if (credentials.caCertificate) {
			tlsOptions.ca = [credentials.caCertificate as string];
		}
		if (credentials.connectionSecurity !== 'startTls') {
			ldapOptions.tlsOptions = tlsOptions;
		}
	}

	if (credentials.timeout) {
		// Convert seconds to milliseconds
		ldapOptions.timeout = (credentials.timeout as number) * 1000;
	}

	if (nodeDebug) {
		context.logger.info(
			`[${nodeType} | ${nodeName}] - LDAP Options: ${JSON.stringify(ldapOptions, null, 2)}`,
		);
	}

	const client = new Client(ldapOptions);
	if (credentials.connectionSecurity === 'startTls') {
		await client.startTLS(tlsOptions);
	}
	return client;
}

export function escapeValue(value: string) {
	return value
		.replace(/\\/g, '\\5c')
		.replace(/\*/g, '\\2a')
		.replace(/\(/g, '\\28')
		.replace(/\)/g, '\\29')
		.replace(/\x00/g, '\\00');
}

/**
 * Resolves the expressions in a raw, expression-capable filter field and escapes
 * only what each expression evaluated to.
 *
 * The literal text around the expressions is filter syntax the user wrote on
 * purpose, so it has to reach the server untouched — escaping the whole
 * resolved string would turn every hand-written `*`, `(` and `)` into a literal
 * character and break the field.
 */
export function escapeResolvables(
	rawValue: string,
	evaluateExpression: (resolvable: string) => unknown,
): string {
	// A raw expression-capable value keeps the leading `=` that marks it as an expression
	let value = rawValue.replace(/^=+/, '');
	// Everything before this index is already resolved, so it is never rescanned
	let searchFrom = 0;

	for (const resolvable of getResolvables(value)) {
		const start = value.indexOf(resolvable, searchFrom);
		if (start === -1) continue;

		const resolvedValue = escapeValue(String(evaluateExpression(resolvable)));
		// Splice by index instead of `String.replace`. That keeps a resolved value
		// which itself looks like an expression from being substituted again, and
		// keeps `$` sequences from expanding into the surrounding filter.
		value = value.slice(0, start) + resolvedValue + value.slice(start + resolvable.length);
		searchFrom = start + resolvedValue.length;
	}

	return value;
}
