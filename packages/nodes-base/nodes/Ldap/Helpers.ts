import { Client } from 'ldapts';
import type { ClientOptions, Entry } from 'ldapts';
import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';
import { LoggerProxy as Logger } from 'n8n-workflow';
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

	if (nodeDebug) {
		Logger.info(
			`[${nodeType} | ${nodeName}] - LDAP Options: ${JSON.stringify(ldapOptions, null, 2)}`,
		);
	}

	const client = new Client(ldapOptions);
	if (credentials.connectionSecurity === 'startTls') {
		await client.startTLS(tlsOptions);
	}
	return client;
}
