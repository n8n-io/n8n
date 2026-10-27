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

async function getJenkinsCrumb(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IDataObject,
): Promise<IDataObject | null> {
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
		uri: `${removeTrailingSlash((credentials.baseUrl as string) || '')}/crumbIssuer/api/json`,
		json: true,
		resolveWithFullResponse: true,
	};
	const response = (await this.helpers.request(options)) as {
		body?: IDataObject;
		headers?: Record<string, string | string[]>;
	};
	const body = response?.body;
	if (!body?.crumbRequestField || !body.crumb) {
		return null;
	}

	const crumbHeaders: IDataObject = {
		[body.crumbRequestField as string]: body.crumb as string,
	};
	// Since Jenkins 2.176.2 a crumb is only valid together with the session it was issued for
	const setCookie = response.headers?.['set-cookie'];
	if (setCookie) {
		crumbHeaders.Cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
			.map((cookie) => cookie.split(';', 1)[0])
			.join('; ');
	}
	return crumbHeaders;
}

// Jenkins only reports a missing crumb in the body of the 403 response
function isMissingCrumbError(error: JsonObject): boolean {
	return Number(error.statusCode) === 403 && /no valid crumb/i.test(String(error.message ?? ''));
}

/**
 * Jenkins answers build triggers with a redirect to the queued item. Returns the queue
 * item URL when the redirect points to one on the same Jenkins instance.
 */
function getQueueItemUrl(error: JsonObject, baseUrl: string): string | undefined {
	const response = error.response as JsonObject | undefined;
	const rawStatusCode = error.statusCode ?? error.httpCode ?? error.status ?? response?.status;
	if (![302, 303].includes(Number(rawStatusCode))) {
		return undefined;
	}

	const headers = (response?.headers ?? error.headers ?? {}) as Record<string, string | undefined>;
	const location = headers.location ?? headers.Location;
	if (typeof location !== 'string') {
		return undefined;
	}

	try {
		const base = new URL(baseUrl);
		const target = new URL(location, base);
		const basePath = removeTrailingSlash(base.pathname);
		if (
			target.origin === base.origin &&
			target.pathname.startsWith(basePath) &&
			/^\/queue\/item\/\d+\/?$/.test(target.pathname.slice(basePath.length))
		) {
			return target.href;
		}
	} catch {
		// Invalid base URL or Location header
	}
	return undefined;
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

	const buildOptions = (extraHeaders: IDataObject = {}): IRequestOptions => {
		const options: IRequestOptions = {
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
		return Object.assign({}, options, option, {
			headers: {
				Accept: 'application/json',
				...extraHeaders,
				...(option.headers as IDataObject | undefined),
			},
		});
	};

	const sendRequest = async () => {
		try {
			return await this.helpers.request(buildOptions());
		} catch (error) {
			// API token requests skip the CSRF check, so a crumb is only fetched when
			// Jenkins asks for one (e.g. password auth) and the request is retried once
			if (!isMissingCrumbError(error)) throw error;
			const crumb = await getJenkinsCrumb.call(this, credentials);
			if (!crumb) throw error;
			return await this.helpers.request(buildOptions(crumb));
		}
	};

	try {
		return await sendRequest();
	} catch (error) {
		const queueUrl = getQueueItemUrl(error as JsonObject, baseUrl);
		if (queueUrl) {
			return { success: true, queueUrl };
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
