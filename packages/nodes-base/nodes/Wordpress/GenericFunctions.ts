import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function wordpressApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		auth: {},
		method,
		qs,
		body,
		uri: '',
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('wordpressApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.auth = {
				user: credentials!.username as string,
				password: credentials!.password as string,
			};

			options.uri = `${credentials!.url}/wp-json/wp/v2${resource}`;

			return await this.helpers.request!(options);
		} else {
			const credentials = this.getCredentials('wordpressOAuth2Api');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.uri = `${credentials!.url}/wp-json/wp/v2${resource}`;
			delete options.auth;

			return await this.helpers.requestOAuth2!.call(this, 'wordpressOAuth2Api', options);
		}
	} catch (error) {
		throw new Error('Wordpress Error: ' + error);
	}
}

export async function wordpressApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 10;
	query.page = 0;

	do {
		query.page++;
		responseData = await wordpressApiRequest.call(this, method, endpoint, body, query, undefined, { resolveWithFullResponse: true });
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers['x-wp-totalpages'] !== undefined &&
		parseInt(responseData.headers['x-wp-totalpages'], 10) < query.page
	);

	return returnData;
}
