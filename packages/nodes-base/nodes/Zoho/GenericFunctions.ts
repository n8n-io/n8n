import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import {
	IDataObject, NodeApiError
} from 'n8n-workflow';

export async function zohoApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const { oauthTokenData: { api_domain } } = await this.getCredentials('zohoOAuth2Api') as { [key: string]: IDataObject };

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body: {
			data: [
				body,
			],
		},
		qs,
		uri: uri || `${api_domain}/crm/v2${resource}`,
		json: true,
	};
	try {
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'zohoOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function zohoApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.per_page = 200;
	query.page = 0;

	do {
		responseData = await zohoApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData.info.more_records;
		returnData.push.apply(returnData, responseData[propertyName]);
		query.page++;
	} while (
		responseData.info.more_records !== undefined &&
		responseData.info.more_records === true
	);

	return returnData;
}
