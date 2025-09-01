import { formatPEM } from '@utils/utilities.js';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { ConnectionOptions as TLSConnectionOptions } from 'tls';

export function getSSLConfig(credentials: ICredentialDataDecryptedObject) {
	const useSSL = credentials.ssl as boolean;
	if (!useSSL) return false;

	return {
		rejectUnauthorized: !(credentials.ignoreSslIssues as boolean),
		ca: credentials.sslCa ? formatPEM(credentials.sslCa as string, ['CERTIFICATE']) : undefined,
		key: credentials.sslClientKey
			? formatPEM(credentials.sslClientKey as string, ['PRIVATE KEY'])
			: undefined,
		cert: credentials.sslClientCertificate
			? formatPEM(credentials.sslClientCertificate as string, ['CERTIFICATE'])
			: undefined,
		passphrase: credentials.sslClientKeyPassphrase as string | undefined,
	} satisfies TLSConnectionOptions;
}
