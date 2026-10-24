import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { removeTrailingSlash } from '@utils/utilities';

export async function getJenkinsCrumb(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IDataObject,
): Promise<IDataObject | null> {
	const baseUrl = (credentials.baseUrl as string) || '';
	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
		},
		method: 'GET',
		auth: {
			username: credentials.username as string,
			password: credentials.apiKey as string,
		},
		sendCredentialsOnCrossOriginRedirect: false,
		uri: `${removeTrailingSlash(baseUrl)}/crumbIssuer/api/json`,
		json: true,
		resolveWithFullResponse: true,
	};
	try {
		const response = (await this.helpers.request(options)) as {
			body?: IDataObject;
			headers?: Record<string, string | string[]>;
		};
		const body = (response?.body ?? response) as IDataObject;
		if (body && body.crumbRequestField && body.crumb) {
			const crumbHeaders: IDataObject = {
				[body.crumbRequestField as string]: body.crumb as string,
			};
			const setCookie = response.headers?.['set-cookie'];
			if (setCookie) {
				crumbHeaders.Cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
					.map((cookie) => cookie.split(';', 1)[0])
					.join('; ');
			}
			return crumbHeaders;
		}
	} catch {
		// Crumb issuer is not enabled (e.g. 404) or unavailable; proceed without it
	}
	return null;
}

export async function jenkinsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	uri: string,
	qs: IDataObject = {},
	body: any = '',
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('jenkinsApi');
	const baseUrl = (credentials.baseUrl as string) || '';
	const headers: IDataObject = {
		Accept: 'application/json',
	};

	if (['POST', 'PUT', 'DELETE'].includes(method)) {
		const crumb = await getJenkinsCrumb.call(this, credentials);
		if (crumb) {
			Object.assign(headers, crumb);
		}
	}

	if (option.headers) {
		Object.assign(headers, option.headers);
	}

	let options: IRequestOptions = {
		headers,
		method,
		auth: {
			username: credentials.username as string,
			password: credentials.apiKey as string,
		},
		sendCredentialsOnCrossOriginRedirect: false,
		uri: `${removeTrailingSlash(baseUrl)}${uri}`,
		json: true,
		qs,
		body,
	};
	options = Object.assign({}, options, option, { headers });
	try {
		return await this.helpers.request(options);
	} catch (error) {
		const rawStatusCode =
			error.statusCode ?? error.httpCode ?? error.status ?? error.response?.status;
		const statusCode = rawStatusCode !== undefined ? Number(rawStatusCode) : undefined;
		const responseHeaders = (error.response?.headers ?? error.headers ?? {}) as Record<
			string,
			string | undefined
		>;
		const location = (responseHeaders.location ?? responseHeaders.Location) as string | undefined;

		if (
			statusCode !== undefined &&
			[302, 303].includes(statusCode) &&
			typeof location === 'string' &&
			/\/queue\/item\/\d+/i.test(location) &&
			!location.includes('/login')
		) {
			return { success: true, queueUrl: location };
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
