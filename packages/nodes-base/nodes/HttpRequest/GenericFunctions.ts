import FormData from 'form-data';
import get from 'lodash/get';
import set from 'lodash/set';
import {
	type ICredentialDataDecryptedObject,
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IOAuth2Options,
	type IRequestOptions,
} from 'n8n-workflow';
import type { SecureContextOptions } from 'tls';

import { formatPrivateKey } from '../../utils/utilities';
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
		microsoftAzureMonitorOAuth2Api: {
			tokenExpiredStatusCode: 403,
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
