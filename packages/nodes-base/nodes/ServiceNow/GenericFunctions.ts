import {
	OptionsWithUri
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

export async function serviceNowApiRequest(this:  IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('serviceNowOAuth2Api');
	console.log(credentials);

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri || `${credentials?.instanceDomain}/api${resource}`,
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

	try {

		return await this.helpers.requestOAuth2!.call(this, 'serviceNowOAuth2Api', options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// export async function serviceNowRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

// 	const returnData: IDataObject[] = [];

// 	let responseData;

// 	let link;

// 	let uri: string | undefined;

// 	do {
// 		responseData = await serviceNowApiRequest.call(this, method, resource, body, query, uri, { resolveWithFullResponse: true });
// 		link = responseData.headers.link;
// 		uri = getNext(link);
// 		returnData.push.apply(returnData, responseData.body);
// 		if (query.limit && (query.limit >= returnData.length)) {
// 			return;
// 		}
// 	} while (
// 		hasMore(link)
// 	);

// 	return returnData;
// }

// function getNext(link: string) {
// 	if (link === undefined) {
// 		return;
// 	}
// 	const next = link.split(',')[1];
// 	if (next.includes('rel="next"')) {
// 		return next.split(';')[0].replace('<', '').replace('>', '').trim();
// 	}
// }

// function hasMore(link: string) {
// 	if (link === undefined) {
// 		return;
// 	}
// 	const next = link.split(',')[1];
// 	if (next.includes('rel="next"')) {
// 		return next.includes('results="true"');
// 	}
// }
