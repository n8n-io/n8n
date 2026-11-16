import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { OperationalError } from '@n8n/errors';
import { requestUrl } from 'n8n-workflow';

import { parseNextPageLink } from '../parseNextPageLink';

export async function venafiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('venafiTlsProtectDatacenterApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
		uri: requestUrl`${credentials.domain}${resource}`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(
			this,
			'venafiTlsProtectDatacenterApi',
			options,
		);
	} catch (error) {
		if (error.response?.body?.error) {
			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new OperationalError(
				`Venafi error response [${error.statusCode}]: ${errors.join('|')}`,
				{ level: 'warning' },
			);
		}
		throw error;
	}
}

export async function venafiApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let next: { resource: RequestPath; qs: IDataObject } | undefined = {
		resource: endpoint,
		qs: query,
	};

	do {
		responseData = await venafiApiRequest.call(this, method, next.resource, body, next.qs);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const nextLink: string | undefined = responseData._links?.[0]?.Next;
		next = nextLink ? parseNextPageLink(this, nextLink, next.resource) : undefined;
	} while (next);

	return returnData;
}
