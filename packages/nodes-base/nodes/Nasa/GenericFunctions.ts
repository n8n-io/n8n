import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function nasaApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, qs: IDataObject, option: IDataObject = {}, uri?: string | undefined): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('nasaApi') as IDataObject;

	qs.api_key = credentials['api_key'] as string;

	const options: OptionsWithUri = {
		method,
		qs,
		uri: uri || `https://api.nasa.gov${endpoint}`,
		json: true,
	};

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request(options);

	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The NASA credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.msg) {
			// Try to return the error prettier
			throw new Error(`NASA error response [${error.statusCode}]: ${error.response.body.msg}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function nasaApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, propertyName: string, method: string, resource: string, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.size = 20;

	let uri: string | undefined = undefined;

	do {
		responseData = await nasaApiRequest.call(this, method, resource, query, {}, uri);
		uri = responseData.links.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.links.next !== undefined
	);

	return returnData;
}


