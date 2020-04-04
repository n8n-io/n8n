import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';
import { errors } from 'imap-simple';

interface OMauticErrorResponse {
	errors: Array<{
		conde: number;
		message: string;
	}>;
}

function getErrors(error: OMauticErrorResponse): string {
	const returnErrors: string[] = [];

	for (const errorItem of error.errors) {
		returnErrors.push(errorItem.message);
	}

	return returnErrors.join(', ');
}


export async function mauticApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mauticApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const base64Key =  Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
	const options: OptionsWithUri = {
		headers: { Authorization: `Basic ${base64Key}` },
		method,
		qs: query,
		uri: uri || `${credentials.url}/api${endpoint}`,
		body,
		json: true
	};
	try {
		const returnData = await this.helpers.request!(options);

		if (returnData.error) {
			// They seem to to sometimes return 200 status but still error.
			throw new Error(getErrors(returnData));
		}

		return returnData;
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {
			throw new Error('Mautic Error: ' + getErrors(error.response.body));
		}
		throw new Error(`Mautic Error: ${error.message}`);
	}
}

/**
 * Make an API request to paginated mautic endpoint
 * and return all results
 */
export async function mauticApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let data: IDataObject[] = [];
	query.limit = 30;
	query.start = 0;

	do {
		responseData = await mauticApiRequest.call(this, method, endpoint, body, query);
		const values = Object.values(responseData[propertyName]);
		for (const value of values) {
			data.push(value as IDataObject);
		}
		returnData.push.apply(returnData, data);
		query.start++;
		data = [];
	} while (
		responseData.total !== undefined &&
		((query.limit * query.start) - parseInt(responseData.total, 10)) < 0
		);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
