import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { ConnectionOptions as TLSConnectionOptions } from 'tls';

function parseSingleLinePEM(raw: string | undefined) {
	if (!raw) return undefined;

	// remember to not replace the space in `BEGIN CERTIFICATE` and `END CERTIFICATE`
	const pemType = raw.match(/-----BEGIN (.*?)-----/)?.[1];

	if (!pemType) {
		// not a pem string we can handle, return as is.
		return raw;
	}

	const begin = `-----BEGIN ${pemType}-----`;
	const end = `-----END ${pemType}-----`;

	let body = raw.replace(begin, '').replace(end, '');
	body = body.replace(/\s/g, ''); // remove any whitespace from body

	const bodyLines = body.match(/.{1,64}/g)?.join('\n');

	if (!bodyLines) {
		return `${begin}\n${end}`;
	}

	return `${begin}\n${bodyLines}\n${end}`;
}

export function getSSLConfig(credentials: ICredentialDataDecryptedObject) {
	const useSSL = credentials.ssl as boolean;
	if (!useSSL) return false;

	return {
		rejectUnauthorized: !(credentials.ignoreSslIssues as boolean),
		ca: parseSingleLinePEM(credentials.sslCa as string | undefined),
		key: parseSingleLinePEM(credentials.sslKey as string | undefined),
		passphrase: credentials.sslKeyPassword as string | undefined,
		cert: parseSingleLinePEM(credentials.sslCert as string | undefined),
	} satisfies TLSConnectionOptions;
}
