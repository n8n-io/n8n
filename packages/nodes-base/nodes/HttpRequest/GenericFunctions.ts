import type { SecureContextOptions } from 'tls';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IOAuth2Options,
	IRequestOptions,
} from 'n8n-workflow';

import set from 'lodash/set';
import isPlainObject from 'lodash/isPlainObject';

import FormData from 'form-data';
import { formatPrivateKey } from '../../utils/utilities';
import type { HttpSslAuthCredentials } from './interfaces';
import get from 'lodash/get';

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

function isObject(obj: unknown): obj is IDataObject {
	return isPlainObject(obj);
}

function redact<T = unknown>(obj: T, secrets: string[]): T {
	if (typeof obj === 'string') {
		return secrets.reduce((safe, secret) => safe.replace(secret, REDACTED), obj) as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => redact(item, secrets)) as T;
	} else if (isObject(obj)) {
		for (const [key, value] of Object.entries(obj)) {
			(obj as IDataObject)[key] = redact(value, secrets);
		}
	}

	return obj;
}

export function sanitizeUiMessage(
	request: IRequestOptions,
	authDataKeys: IAuthDataSanitizeKeys,
	secrets?: string[],
) {
	let sendRequest = request as unknown as IDataObject;

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
				// eslint-disable-next-line @typescript-eslint/no-loop-func
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

	if (secrets && secrets.length > 0) {
		return redact(sendRequest, secrets);
	}

	return sendRequest;
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
		microsoftDynamicsOAuth2Api: {
			property: 'id_token',
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
				const data = entry[key] as { value: Buffer; options: FormData.AppendOptions };
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
		if (sslCertificates.ca) agentOptions.ca = formatPrivateKey(sslCertificates.ca);
		if (sslCertificates.cert) agentOptions.cert = formatPrivateKey(sslCertificates.cert);
		if (sslCertificates.key) agentOptions.key = formatPrivateKey(sslCertificates.key);
		if (sslCertificates.passphrase)
			agentOptions.passphrase = formatPrivateKey(sslCertificates.passphrase);
		requestOptions.agentOptions = agentOptions;
	}
};
