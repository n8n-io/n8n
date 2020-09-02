import {
	sign,
} from 'aws4';

import {
	get,
} from 'lodash';

import {
	OptionsWithUri,
} from 'request';

import {
	parseString,
} from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

import { URL } from 'url';

export async function s3ApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, bucket: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	let credentials;

	credentials = this.getCredentials('customS3Endpoint');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (!(credentials.endpoint as string).startsWith('http')) {
		throw new Error('HTTP(S) Scheme is required in endpoint definition');
	}

	const endpoint = new URL(credentials.endpoint as string);

	if (bucket) {
		if (credentials.forcePathStyle) {
			path = `/${bucket}${path}`;
		} else {
			endpoint.host = `${bucket}.${endpoint.host}`;
		}
	}

	endpoint.pathname = path;

	// Sign AWS API request with the user credentials
	const signOpts = {
		headers: headers || {},
		region: region || credentials.region,
		host: endpoint.host,
		method,
		path: `${path}?${queryToString(query).replace(/\+/g, '%2B')}`,
		service: 's3',
		body
	};

	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim()});

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		qs: query,
		uri: endpoint,
		body: signOpts.body,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response?.body.message || error.response?.body.Message || error.message;

		if (error.statusCode === 403) {
			if (errorMessage === 'The security token included in the request is invalid.') {
				throw new Error('The S3 credentials are not valid!');
			} else if (errorMessage.startsWith('The request signature we calculated does not match the signature you provided')) {
				throw new Error('The S3 credentials are not valid!');
			}
		}

		throw new Error(`S3 error response [${error.statusCode}]: ${errorMessage}`);
	}
}

export async function s3ApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, bucket: string, method: string, path: string, body?: string, query: IDataObject = {}, headers?: object, options: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const response = await s3ApiRequest.call(this, bucket, method, path, body, query, headers, options, region);
	try {
		return JSON.parse(response);
	} catch (e) {
		return response;
	}
}

export async function s3ApiRequestSOAP(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, bucket: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const response = await s3ApiRequest.call(this, bucket, method, path, body, query, headers, option, region);
	try {
		return await new Promise((resolve, reject) => {
			parseString(response, { explicitArray: false }, (err, data) => {
				if (err) {
					return reject(err);
				}
				resolve(data);
			});
		});
	} catch (e) {
		return e;
	}
}

export async function s3ApiRequestSOAPAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, propertyName: string, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers: IDataObject = {}, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await s3ApiRequestSOAP.call(this, service, method, path, body, query, headers, option, region);

		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`)) {
			query['continuation-token'] = get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName));
			} else {
				returnData.push(get(responseData, propertyName));
			}
		}
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== undefined &&
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== 'false'
	);

	return returnData;
}

function queryToString(params: IDataObject) {
	return Object.keys(params).map(key => key + '=' + params[key]).join('&');
}
