import type { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

/**
 * Make an API request to Gitlab
 *
 */
export async function gitlabApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: object,
	option: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		method,
		headers: {},
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	if (query === undefined) {
		delete options.qs;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('gitlabApi');
			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;
			return await this.helpers.requestWithAuthentication.call(this, 'gitlabApi', options);
		} else {
			const credentials = await this.getCredentials('gitlabOAuth2Api');

			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;

			return await this.helpers.requestOAuth2.call(this, 'gitlabOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function gitlabApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await gitlabApiRequest.call(this, method, endpoint, body, query, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (responseData.headers.link?.includes('next'));
	return returnData;
}
