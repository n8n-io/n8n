import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function harvestApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, qs: IDataObject = {}, uri: string, body: IDataObject = {}, option: IDataObject = {}, ): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		method,
		body,
		uri: `https://api.harvestapp.com/v2/${uri}?`,
		json: true,
		headers: {
			"User-Agent": "Harvest API"
		}
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('harvestApi') as IDataObject;

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.qs.access_token = credentials.accessToken;
			options.qs.account_id = credentials.accountId;


			const queryStringElements = convertToQueryString(qs);
			options.uri = options.uri + queryStringElements.join('&');

			return await this.helpers.request!(options);
		} else {
			const queryStringElements = convertToQueryString(qs);
			options.uri = options.uri + queryStringElements.join('&');

			return await this.helpers.requestOAuth2!.call(this, 'harvestOAuth2Api', options);
		}
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Harvest credentials are not valid!');
		}

		if (error.error && error.error.message) {
			// Try to return the error prettier
			throw new Error(`Harvest error response [${error.statusCode}]: ${error.error.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw new Error(`Harvest error response: ${error.message}`);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function harvestApiRequestAllItems(
		this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		method: string,
		qs: IDataObject = {},
		uri: string,
		resource: string,
		body: IDataObject = {},
		option: IDataObject = {},
	): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	try {
		do {
			responseData = await harvestApiRequest.call(this, method, qs, uri, body, option);
			qs.page = responseData.next_page;
			returnData.push.apply(returnData, responseData[resource]);
		} while (responseData.next_page);
		return returnData;
		} catch(error) {
		throw error;
	}
}

// tslint:disable-next-line: no-any
function convertToQueryString(qs : any) {
	// Convert to query string into a format the API can read
	const queryStringElements: string[] = [];
	for (const key of Object.keys(qs)) {
		if (Array.isArray(qs[key])) {
			(qs[key] as string[]).forEach(value => {
				queryStringElements.push(`${key}=${value}`);
			});
		} else {
			queryStringElements.push(`${key}=${qs[key]}`);
		}
	}
	return queryStringElements;
}
