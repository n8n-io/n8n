import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { IMessage } from './MessageInterface';
import type { IStream } from './StreamInterface';
import type { IUser } from './UserInterface';

export async function zulipApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: IMessage | IStream | IUser = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('zulipApi');

	const endpoint = `${credentials.url.toString().replace(new RegExp('/$'), '')}/api/v1`;

	let options: IRequestOptions = {
		auth: {
			user: credentials.email as string,
			password: credentials.apiKey as string,
		},
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body as IDataObject,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// A multiOptions parameter normally resolves to an array. When its value comes
// from an expression that is wrapped in surrounding text/whitespace, n8n
// switches to string interpolation and the array is coerced to a comma-joined
// string. Accept both shapes so the node degrades gracefully instead of
// throwing a low-level "join is not a function" TypeError.
export function toMultiOptionsCsv(value: unknown): string {
	if (Array.isArray(value)) {
		return value
			.map((entry) => String(entry).trim())
			.filter((entry) => entry.length > 0)
			.join(',');
	}
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0)
			.join(',');
	}
	return '';
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
