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
	const HEADER_BLOCKLIST = new Set([
		'authorization',
		'x-api-key',
		'x-auth-token',
		'cookie',
		'proxy-authorization',
		'sslclientcert',
	]);

	const headers = sendRequest.headers as IDataObject;

	if (headers) {
		for (const headerName of Object.keys(headers)) {
			if (HEADER_BLOCKLIST.has(headerName.toLowerCase())) {
				headers[headerName] = REDACTED;
			}
		}
	}
	if (secrets && secrets.length > 0) {
		return redact(sendRequest, secrets);
	}

	return sendRequest;
}
