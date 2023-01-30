import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Message Bird
 *
 */
export async function messageBirdApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject,
	query: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('messageBirdApi');

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			Authorization: `AccessKey ${credentials.accessKey}`,
		},
		method,
		qs: query,
		body,
		uri: `https://rest.messagebird.com${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
