import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export async function venafiApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('venafiAsAServiceApi') as IDataObject;
	
	const operation = this.getNodeParameter('operation', 0) as string;

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'content-type': 'application/json',
			'tppl-api-key': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.venafi.cloud${resource}`,
		json: true,
	};

	if (operation === 'download') {
		delete options!.headers!['Accept'];
		delete options!.headers!['content-type'];
		options.json = false;
	}

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		console.log(options);
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function venafiApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await venafiApiRequest.call(this, method, endpoint, body, query);
		endpoint = get(responseData, '_links[0].Next');
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData._links &&
		responseData._links[0].Next
	);

	return returnData;
}
