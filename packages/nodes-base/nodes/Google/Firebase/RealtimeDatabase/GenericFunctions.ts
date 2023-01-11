import { OptionsWithUrl } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	projectId: string,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	uri: string | null = null,
): Promise<any> {
	const { region } = (await this.getCredentials(
		'googleFirebaseRealtimeDatabaseOAuth2Api',
	)) as IDataObject;

	const options: OptionsWithUrl = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: uri || `https://${projectId}.${region}/${resource}.json`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(
			this,
			'googleFirebaseRealtimeDatabaseOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	projectId: string,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	_headers: IDataObject = {},
	uri: string | null = null,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	qs.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(
			this,
			projectId,
			method,
			resource,
			body,
			qs,
			{},
			uri,
		);
		qs.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[resource]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
