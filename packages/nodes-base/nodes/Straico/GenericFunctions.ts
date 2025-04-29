import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestHelper,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

// File validation constants and utilities
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
export const SUPPORTED_FILE_TYPES = [
	'pdf', 'docx', 'pptx', 'txt', 'xlsx', 'mp3', 'mp4', 'html', 'csv', 'json',
	'py', 'php', 'js', 'css', 'cs', 'swift', 'kt', 'xml', 'ts', 'png', 'jpg', 'jpeg', 'webp', 'gif'
];

export function validateFile(buffer: Buffer, filename: string) {
	if (buffer.length > MAX_FILE_SIZE) {
		throw new Error(`File size exceeds maximum limit of 25MB`);
	}

	const extension = filename.split('.').pop()?.toLowerCase();
	if (!extension || !SUPPORTED_FILE_TYPES.includes(extension)) {
		throw new Error(`Unsupported file type: ${extension}. Supported types are: ${SUPPORTED_FILE_TYPES.join(', ')}`);
	}
}

export const API_VERSIONS = {
	V0: 'v0',
	V1: 'v1',
} as const;

export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];

export const API_ENDPOINTS = {
	[API_VERSIONS.V0]: {
		BASE: 'https://api.straico.com/v0',
		USER: '/user',
		MODELS: '/models',
		PROMPT_COMPLETION: '/prompt/completion',
		FILE: '/file',
		IMAGE: '/image',
		AGENT: '/agent',
		RAG: '/rag',
	},
	[API_VERSIONS.V1]: {
		BASE: 'https://api.straico.com/v1',
		MODELS: '/models',
		PROMPT_COMPLETION: '/prompt/completion',
		FILE: '/file',
		IMAGE: '/image',
		AGENT: '/agent',
		RAG: '/rag',
	},
} as const;

export async function straicoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	version: ApiVersion,
	endpoint: string,
	body: object = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('straicoApi');

	const options: IRequestOptions = {
		method,
		body,
		qs,
		url: `${API_ENDPOINTS[version].BASE}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'straicoApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function straicoApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	version: ApiVersion,
	endpoint: string,
	body: object = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	const responseData = await straicoApiRequest.call(this, method, version, endpoint, body, qs);

	if (Array.isArray(responseData)) {
		returnData.push(...responseData);
	} else {
		returnData.push(responseData);
	}

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
