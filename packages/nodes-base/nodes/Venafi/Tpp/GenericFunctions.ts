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
	IDataObject,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export async function venafiApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('venafiTppApi') as IDataObject;

	const data = await getToken.call(this);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${data.access_token}`,
		},
		method,
		body,
		qs,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
		uri: uri || `${credentials.domain}${resource}`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Venafi error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
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

async function getToken(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IPollFunctions): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('venafiTppApi') as IDataObject;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const url = `${credentials.domain}/vedauth/authorize/oauth`;

	let requestOptions: OptionsWithUri;
	// Reset all values
	requestOptions = {
		uri: url,
		headers: {},
		method: 'POST',
		json: true,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
		body: {
			client_id: credentials.clientId,
			username: credentials.username,
			password: credentials.password,
			scope: 'certificate:manage',
		},
	};

	try {
		return await this.helpers.request!(requestOptions);

	} catch (error) {
		throw error;
	}
}
