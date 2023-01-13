import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

import moment from 'moment-timezone';

import * as jwt from 'jsonwebtoken';

async function getAccessToken(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	credentials: IDataObject,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();

	const scopes = ['https://www.googleapis.com/auth/bigquery'];

	const now = moment().unix();

	const signature = jwt.sign(
		{
			iss: credentials.email as string,
			sub: credentials.delegatedEmail ?? (credentials.email as string),
			scope: scopes.join(' '),
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600,
		},
		privateKey,
		{
			algorithm: 'RS256',
			header: {
				kid: privateKey,
				typ: 'JWT',
				alg: 'RS256',
			},
		},
	);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signature,
		},
		uri: 'https://oauth2.googleapis.com/token',
		json: true,
	};

	return this.helpers.request(options);
}

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri ?? `https://bigquery.googleapis.com/bigquery${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const { access_token } = await getAccessToken.call(this, credentials as IDataObject);

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleBigQueryOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.pageToken;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.pageToken !== undefined && responseData.pageToken !== '');

	return returnData;
}

export function simplify(rows: IDataObject[], fields: string[]) {
	const results = [];
	for (const row of rows) {
		const record: IDataObject = {};
		for (const [index, field] of fields.entries()) {
			record[field] = (row.f as IDataObject[])[index].v;
		}
		results.push(record);
	}
	return results;
}
