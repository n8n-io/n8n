import { formatPemBlock } from '@n8n/utils/format-pem-block';
import FormData from 'form-data';
import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';
import set from 'lodash/set';
import {
	deepCopy,
	getCredentialAllowedDomains,
	type ICredentialDataDecryptedObject,
	type IDataObject,
	type INode,
	type INodeExecutionData,
	type IOAuth2Options,
	type IRequestOptions,
} from 'n8n-workflow';
import { Stream, type Readable } from 'stream';
import type { SecureContextOptions } from 'tls';

import type { HttpSslAuthCredentials } from './interfaces';

export type BodyParameter = {
	name: string;
	value: string;
	parameterType?: 'formBinaryData' | 'formData';
};

export type IAuthDataSanitizeKeys = {
	[key: string]: string[];
};

export const replaceNullValues = (item: INodeExecutionData) => {
	if (item.json === null) {
		item.json = {};
	}
	return item;
};

export const REDACTED = '**hidden**';

const STREAM_REPLACEMENT = 'Binary data got replaced with this text. Original was a stream.';

function isObject(obj: unknown): obj is IDataObject {
	return isPlainObject(obj);
}

/**
 * Swaps an upload out of a value headed for the browser. A stream has to go
 * before `deepCopy` runs: once the request is in flight its pipe chain is
 * circular, and `deepCopy` faithfully preserves cycles.
 *
 * A multipart upload is a `form-data` instance from node version 4.2 on, but a
 * plain `{ field: { value, options } }` map below that and in V1/V2, so a field
 * value gets the same treatment as the root — it is a stream or a Buffer
 * depending on whether binary data is stored outside the run data.
 */
function replaceUploads(value: IDataObject[string]): IDataObject[string] {
	if (value instanceof Stream) return STREAM_REPLACEMENT;

	if (Buffer.isBuffer(value)) {
		return value.length > 250000
			? `Binary data got replaced with this text. Original was a Buffer with a size of ${value.length} bytes.`
			: value;
	}

	if (!isObject(value)) return value;

	// `Object.fromEntries` defines each key instead of assigning it, so a request
	// property carrying an own `__proto__` key keeps it rather than retargeting
	// this object's prototype.
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			isObject(entry) && 'value' in entry
				? { ...entry, value: replaceUploads(entry.value) }
				: entry,
		]),
	) as IDataObject;
}

function redactString(str: string, secrets: string[]): string {
	return secrets.reduce((safe, secret) => safe.split(secret).join(REDACTED), str);
}

function redact<T = unknown>(obj: T, secrets: string[]): T {
	if (typeof obj === 'string') {
		return redactString(obj, secrets) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => redact(item, secrets)) as T;
	} else if (isObject(obj)) {
		const result: IDataObject = {};
		for (const [key, value] of Object.entries(obj)) {
			const redactedKey = redactString(key, secrets);
			result[redactedKey] = redact(value, secrets);
		}
		return result as T;
	}

	return obj;
}

export function sanitizeUiMessage(
	request: IRequestOptions,
	authDataKeys: IAuthDataSanitizeKeys,
	secrets?: string[],
) {
	const { body, ...rest } = request as IDataObject;

	// `body` is not copied: `deepCopy` turns a Buffer into `{ type, data }`.
	const sendRequest: IDataObject = { body: replaceUploads(body) };
	for (const [key, value] of Object.entries(rest)) {
		sendRequest[key] = deepCopy(replaceUploads(value));
	}

	// Remove credential information
	for (const [requestProperty, authKeys] of Object.entries(authDataKeys)) {
		const target = sendRequest[requestProperty];
		// A property swapped for a placeholder string has nothing to redact, and
		// iterating it would yield one key per character.
		if (!isObject(target)) continue;

		const redacted = { ...target };
		for (const key of authKeys) {
			if (key in redacted) redacted[key] = REDACTED;
		}
		sendRequest[requestProperty] = redacted;
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

export function getSecrets(credentials: ICredentialDataDecryptedObject): string[] {
	const secrets = Object.values(credentials).filter(
		(value): value is string => typeof value === 'string' && value.length > 0,
	);

	const oauthAccessToken = get(credentials, 'oauthTokenData.access_token');
	if (typeof oauthAccessToken === 'string' && !secrets.includes(oauthAccessToken)) {
		secrets.push(oauthAccessToken);
	}

	return secrets;
}

export const getOAuth2AdditionalParameters = (nodeCredentialType: string) => {
	const oAuth2Options: { [credentialType: string]: IOAuth2Options } = {
		bitlyOAuth2Api: {
			tokenType: 'Bearer',
		},
		boxOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		ciscoWebexOAuth2Api: {
			tokenType: 'Bearer',
		},
		clickUpOAuth2Api: {
			keepBearer: false,
			tokenType: 'Bearer',
		},
		goToWebinarOAuth2Api: {
			tokenExpiredStatusCode: 403,
		},
		hubspotDeveloperApi: {
			tokenType: 'Bearer',
			includeCredentialsOnRefreshOnBody: true,
		},
		hubspotOAuth2Api: {
			tokenType: 'Bearer',
			includeCredentialsOnRefreshOnBody: true,
		},
		lineNotifyOAuth2Api: {
			tokenType: 'Bearer',
		},
		linkedInOAuth2Api: {
			tokenType: 'Bearer',
		},
		mailchimpOAuth2Api: {
			tokenType: 'Bearer',
		},
		mauticOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		microsoftAzureMonitorOAuth2Api: {
			tokenExpiredStatusCode: 403,
		},
		philipsHueOAuth2Api: {
			tokenType: 'Bearer',
		},
		raindropOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
		shopifyOAuth2Api: {
			tokenType: 'Bearer',
			keyToIncludeInAccessTokenHeader: 'X-Shopify-Access-Token',
		},
		slackOAuth2Api: {
			tokenType: 'Bearer',
			property: 'authed_user.access_token',
		},
		stravaOAuth2Api: {
			includeCredentialsOnRefreshOnBody: true,
		},
	};
	return oAuth2Options[nodeCredentialType];
};

//https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
export const binaryContentTypes = [
	'image/',
	'audio/',
	'video/',
	'application/octet-stream',
	'application/gzip',
	'application/zip',
	'application/vnd.rar',
	'application/epub+zip',
	'application/x-bzip',
	'application/x-bzip2',
	'application/x-cdf',
	'application/vnd.amazon.ebook',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-fontobject',
	'application/vnd.oasis.opendocument.presentation',
	'application/pdf',
	'application/x-tar',
	'application/vnd.visio',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/x-7z-compressed',
];

export type BodyParametersReducer = (
	acc: IDataObject,
	cur: { name: string; value: string },
) => Promise<IDataObject>;

export async function reduceAsync<T, R>(
	arr: T[],
	reducer: (acc: Awaited<Promise<R>>, cur: T) => Promise<R>,
	init: Promise<R> = Promise.resolve({} as R),
): Promise<R> {
	return await arr.reduce(async (promiseAcc, item) => {
		return await reducer(await promiseAcc, item);
	}, init);
}

export const prepareRequestBody = async (
	parameters: BodyParameter[],
	bodyType: string,
	version: number,
	defaultReducer: BodyParametersReducer,
) => {
	if (bodyType === 'json' && version >= 4) {
		return await parameters.reduce(async (acc, entry) => {
			const result = await acc;
			set(result, entry.name, entry.value);
			return result;
		}, Promise.resolve({}));
	} else if (bodyType === 'multipart-form-data' && version >= 4.2) {
		const formData = new FormData();

		for (const parameter of parameters) {
			if (parameter.parameterType === 'formBinaryData') {
				const entry = await defaultReducer({}, parameter);
				const key = Object.keys(entry)[0];
				const data = entry[key] as { value: Buffer | Readable; options: FormData.AppendOptions };
				formData.append(key, data.value, data.options);
				continue;
			}

			formData.append(parameter.name, parameter.value);
		}

		return formData;
	} else {
		return await reduceAsync(parameters, defaultReducer);
	}
};

export const setAgentOptions = (
	requestOptions: IRequestOptions,
	sslCertificates: HttpSslAuthCredentials | undefined,
) => {
	if (sslCertificates) {
		const agentOptions: SecureContextOptions = {};
		if (sslCertificates.ca) agentOptions.ca = formatPemBlock(sslCertificates.ca);
		if (sslCertificates.cert) agentOptions.cert = formatPemBlock(sslCertificates.cert);
		if (sslCertificates.key) agentOptions.key = formatPemBlock(sslCertificates.key);
		if (sslCertificates.passphrase) agentOptions.passphrase = sslCertificates.passphrase;
		requestOptions.agentOptions = agentOptions;
	}
};

export const updadeQueryParameterConfig = (version: number) => {
	if (version < 4.3) {
		return (qs: IDataObject, name: string, value: string) => (qs[name] = value);
	} else {
		return (qs: { [key: string]: any }, name: string, value: any) => {
			if (qs[name] === undefined) {
				qs[name] = value;
			} else if (Array.isArray(qs[name])) {
				qs[name].push(value);
			} else {
				qs[name] = [qs[name], value];
			}
		};
	}
};

export const getAllowedDomains = (
	node: INode,
	credentialData: ICredentialDataDecryptedObject,
): string | undefined =>
	getCredentialAllowedDomains({ node, credentialData, surface: 'HTTP Request or GraphQL' });
