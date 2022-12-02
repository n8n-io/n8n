import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function quickbaseApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('quickbaseApi');

	if (!credentials.hostname) {
		throw new NodeOperationError(this.getNode(), 'Hostname must be defined');
	}

	if (!credentials.userToken) {
		throw new NodeOperationError(this.getNode(), 'User Token must be defined');
	}

	try {
		const options: OptionsWithUri = {
			headers: {
				'QB-Realm-Hostname': credentials.hostname,
				'User-Agent': 'n8n',
				Authorization: `QB-USER-TOKEN ${credentials.userToken}`,
				'Content-Type': 'application/json',
			},
			method,
			body,
			qs,
			uri: `https://api.quickbase.com/v1${resource}`,
			json: true,
		};

		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}

		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

//@ts-ignore
// prettier-ignore
export async function getFieldsObject(this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions, tableId: string): any { 
	const fieldsLabelKey: { [key: string]: number } = {};
	const fieldsIdKey: { [key: number]: string } = {};
	const data = await quickbaseApiRequest.call(this, 'GET', '/fields', {}, { tableId });
	for (const field of data) {
		fieldsLabelKey[field.label] = field.id;
		fieldsIdKey[field.id] = field.label;
	}
	return { fieldsLabelKey, fieldsIdKey };
}

export async function quickbaseApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData = [];

	if (method === 'POST') {
		body.options = {
			skip: 0,
			top: 100,
		};
	} else {
		query.skip = 0;
		query.top = 100;
	}

	let metadata;

	do {
		const {
			data,
			fields,
			metadata: meta,
		} = await quickbaseApiRequest.call(this, method, resource, body, query);

		metadata = meta;

		const fieldsIdKey: { [key: string]: string } = {};

		for (const field of fields) {
			fieldsIdKey[field.id] = field.label;
		}

		for (const record of data) {
			const recordData: IDataObject = {};
			for (const [key, value] of Object.entries(record)) {
				recordData[fieldsIdKey[key]] = (value as IDataObject).value;
			}
			responseData.push(recordData);
		}

		if (method === 'POST') {
			body.options.skip += body.options.top;
		} else {
			//@ts-ignore
			query.skip += query.top;
		}
		returnData.push.apply(returnData, responseData);
		responseData = [];
	} while (returnData.length < metadata.totalRecords);

	return returnData;
}
