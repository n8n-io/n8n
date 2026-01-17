import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';

import type {
	IAuthDataSanitizeKeys,
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
	IRequestOptions,
} from './interfaces';
import { deepCopy, setSafeObjectProperty } from './utils';

const REDACTED = '**hidden**';

const HEADER_BLOCKLIST = new Set([
	'authorization',
	'proxy-authorization',
	'www-authenticate',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'x-authorization',
	'x-csrf-token',
	'x-xsrf-token',
	'x-jwt-token',
	'x-session-token',
	'x-sessionid',
	'x-forwarded-authorization',
	'set-cookie',
	'cookie',
	'sslclientcert',
	'ssl-client-cert',
	'ssl-client-key',
	'ssl-client-sigalg',
	'ssl-client-dn',
	'ssl-client-serial',
	'ssl-client-issuer',
	'ssl-client-verify',
	'x-private-token',
	'x-gitlab-token',
	'x-heroku-authorization',
	'apikey',
	'api-key',
	'bearer',
	'auth-token',
]);

function isObject(obj: unknown): obj is IDataObject {
	return isPlainObject(obj);
}

function redact<T = unknown>(obj: T, secrets: string[]): T {
	if (typeof obj === 'string') {
		return secrets.reduce((safe, secret) => safe.replace(secret, REDACTED), obj) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item: unknown) => redact(item, secrets)) as T;
	} else if (isObject(obj)) {
		for (const [key, value] of Object.entries(obj)) {
			setSafeObjectProperty(obj, key, redact(value, secrets));
		}
	}

	return obj;
}

export function getSecrets(
	properties: INodeProperties[],
	credentials: ICredentialDataDecryptedObject,
): string[] {
	const sensitivePropNames = new Set(
		properties.filter((prop) => prop.typeOptions?.password).map((prop) => prop.name),
	);

	const secrets = Object.entries(credentials)
		.filter(([propName]) => sensitivePropNames.has(propName))
		.map(([_, value]) => value)
		.filter((value): value is string => typeof value === 'string');
	const oauthAccessToken = get(credentials, 'oauthTokenData.access_token');
	if (typeof oauthAccessToken === 'string') {
		secrets.push(oauthAccessToken);
	}

	return secrets;
}

export function sanitizeUiMessage(
	request: IRequestOptions | IHttpRequestOptions,
	authDataKeys: IAuthDataSanitizeKeys,
	secrets?: string[],
): IDataObject {
	const filteredSecrets = secrets?.filter((secret) => secret.trim().length > 0);
	const { body, ...rest } = request as IDataObject;

	let sendRequest: IDataObject = { body };
	for (const [key, value] of Object.entries(rest)) {
		sendRequest[key] = deepCopy(value);
	}

	// Protect browser from sending large binary data
	if (Buffer.isBuffer(sendRequest.body) && sendRequest.body.length > 250000) {
		sendRequest = {
			...request,
			body: `Binary data got replaced with this text. Original was a Buffer with a size of ${
				(request.body as string).length
			} bytes.`,
		};
	}

	// Remove credential information
	for (const requestProperty of Object.keys(authDataKeys)) {
		sendRequest = {
			...sendRequest,
			[requestProperty]: Object.keys(sendRequest[requestProperty] as object).reduce(
				(acc: IDataObject, curr) => {
					acc[curr] = authDataKeys[requestProperty].includes(curr)
						? REDACTED
						: (sendRequest[requestProperty] as IDataObject)[curr];
					return acc;
				},
				{},
			),
		};
	}

	const headers = sendRequest.headers as IDataObject;

	if (headers) {
		for (const headerName of Object.keys(headers)) {
			if (HEADER_BLOCKLIST.has(headerName.toLowerCase())) {
				headers[headerName] = REDACTED;
			}
		}
	}
	if (filteredSecrets && filteredSecrets.length > 0) {
		return redact(sendRequest, filteredSecrets);
	}

	return sendRequest;
}
