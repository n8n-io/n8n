import {
	OptionsWithUri
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function sentryIoApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authentication = this.getNodeParameter('authentication', 0);

	const version = this.getNodeParameter('sentryVersion', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri || `https://sentry.io${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (options.qs.limit) {
		delete options.qs.limit;
	}

	let credentialName;

	try {
		const code = this.getNodeParameter('code',0)
		const secretOptions = {
			method:'get',
			uri:'http://127.0.0.1:4000/secretStore/fetchSecrets',
			qs:{code}
		}
		const credentials = await this.helpers.request!(secretOptions);
		
		options.headers = Object.assign({}, options.headers, {'Authorization':'Bearer '+credentials.accessToken});
		
		return await this.helpers.request!(options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function sentryApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let link;

	let uri: string | undefined;

	do {
		responseData = await sentryIoApiRequest.call(this, method, resource, body, query, uri, { resolveWithFullResponse: true });
		link = responseData.headers.link;
		uri = getNext(link);
		returnData.push.apply(returnData, responseData.body);
		if (query.limit && (query.limit >= returnData.length)) {
			return;
		}
	} while (
		hasMore(link)
	);

	return returnData;
}

function getNext(link: string) {
	if (link === undefined) {
		return;
	}
	const next = link.split(',')[1];
	if (next.includes('rel="next"')) {
		return next.split(';')[0].replace('<', '').replace('>', '').trim();
	}
}

function hasMore(link: string) {
	if (link === undefined) {
		return;
	}
	const next = link.split(',')[1];
	if (next.includes('rel="next"')) {
		return next.includes('results="true"');
	}
}
