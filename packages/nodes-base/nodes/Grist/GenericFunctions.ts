import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	GristCredentials,
	GristDefinedFields,
	GristFilterProperties,
	GristSortProperties,
} from './types';

// A trailing slash or a trailing `/api` are both easy to paste in from a browser or the
// API docs. Request paths append `/api` themselves, so the base URL needs neither.
function normalizeBaseUrl(url: string): string {
	return url.replace(/\/$/, '').replace(/\/api$/, '');
}

// Fallback for API-key credentials created before the single `url` field: self-hosted
// instances stored a full URL, teams stored a subdomain. Defaults to the SaaS API host,
// which serves every hosted account.
function gristLegacyBaseUrl(credentials: GristCredentials): string {
	if (credentials.selfHostedUrl) {
		return normalizeBaseUrl(credentials.selfHostedUrl);
	}
	if (credentials.customSubdomain) {
		return `https://${credentials.customSubdomain}.getgrist.com`;
	}
	return 'https://api.getgrist.com';
}

// Resolve the Grist server base URL. Credentials store a single `url`; older ones fall
// back to their legacy fields.
export function gristBaseUrl(credentials: GristCredentials): string {
	if (credentials.url) {
		return normalizeBaseUrl(credentials.url);
	}
	return gristLegacyBaseUrl(credentials);
}

export async function gristApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | number[] = {},
	qs: IDataObject = {},
) {
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey') as string;
	const credentialsType = authentication === 'oAuth2' ? 'gristOAuth2Api' : 'gristApi';
	const credentials = await this.getCredentials<GristCredentials>(credentialsType);

	const options: IRequestOptions = {
		method,
		uri: `${gristBaseUrl(credentials)}/api${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	// The OAuth helper attaches its own Authorization header; the API key path sets one here.
	if (authentication !== 'oAuth2') {
		options.headers = { Authorization: `Bearer ${credentials.apiKey}` };
	}

	try {
		if (authentication === 'oAuth2') {
			return await this.helpers.requestOAuth2.call(this, 'gristOAuth2Api', options);
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function parseSortProperties(sortProperties: GristSortProperties) {
	return sortProperties.reduce((acc, cur, curIdx) => {
		if (cur.direction === 'desc') acc += '-';
		acc += cur.field;
		if (curIdx !== sortProperties.length - 1) acc += ',';
		return acc;
	}, '');
}

export function isSafeInteger(val: number) {
	//used MIN_SAFE_INTEGER and MAX_SAFE_INTEGER instead of MIN_VALUE and MAX_VALUE to avoid edge cases
	return !isNaN(val) && val > Number.MIN_SAFE_INTEGER && val < Number.MAX_SAFE_INTEGER;
}

export function parseFilterProperties(
	this: IExecuteFunctions,
	filterProperties: GristFilterProperties,
) {
	return filterProperties.reduce<{ [key: string]: Array<string | number> }>((acc, cur) => {
		acc[cur.field] = acc[cur.field] ?? [];
		acc[cur.field].push(coerceFilterValue.call(this, cur.values, cur.type));
		return acc;
	}, {});
}

/**
 * Grist's filter API matches by exact JSON type, so a numeric-looking value has to be sent as the
 * same type the target column actually stores. Since the node has no way to know that column's
 * type, 'autoDetect' (the default, kept for filters saved before this field existed) guesses from
 * the value's shape - which is wrong for a text column whose values happen to look numeric, hence
 * the explicit 'string'/'number' overrides.
 */
function coerceFilterValue(
	this: IExecuteFunctions,
	value: string,
	type: 'autoDetect' | 'string' | 'number' = 'autoDetect',
) {
	if (type === 'string') return value;
	if (type === 'number') {
		const numericValue = Number(value);
		if (!Number.isFinite(numericValue)) {
			throw new NodeOperationError(
				this.getNode(),
				`Filter value "${value}" is not a valid number. Change the value, or set Type to String or Auto-Detect instead.`,
			);
		}
		return numericValue;
	}
	return isSafeInteger(Number(value)) ? Number(value) : value;
}

export function parseDefinedFields(fieldsToSendProperties: GristDefinedFields) {
	return fieldsToSendProperties.reduce<{ [key: string]: string }>((acc, cur) => {
		acc[cur.fieldId] = cur.fieldValue;
		return acc;
	}, {});
}

export function parseAutoMappedInputs(incomingKeys: string[], inputsToIgnore: string[], item: any) {
	return incomingKeys.reduce<{ [key: string]: any }>((acc, curKey) => {
		if (inputsToIgnore.includes(curKey)) return acc;
		acc = { ...acc, [curKey]: item[curKey] };
		return acc;
	}, {});
}

export function throwOnZeroDefinedFields(this: IExecuteFunctions, fields: GristDefinedFields) {
	if (!fields?.length) {
		throw new NodeOperationError(
			this.getNode(),
			"No defined data found. Please specify the data to send in 'Fields to Send'.",
		);
	}
}
