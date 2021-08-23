import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	MispCredentials,
} from './types';

export async function mispApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const {
		baseUrl,
		apiKey,
		allowUnauthorizedCerts,
	} = await this.getCredentials('mispApi') as MispCredentials;

	const options: OptionsWithUri = {
		headers: {
			Authorization: apiKey,
		},
		method,
		body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		rejectUnauthorized: !allowUnauthorizedCerts,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function mispApiRequestAllItems(
	this: IExecuteFunctions,
	endpoint: string,
) {
	const responseData = await mispApiRequest.call(this, 'GET', endpoint);
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (!returnAll) {
		const limit = this.getNodeParameter('limit', 0) as number;
		return responseData.slice(0, limit);
	}

	return responseData;
}

export function throwOnEmptyUpdate(
	this: IExecuteFunctions,
	resource: string,
	updateFields: IDataObject,
) {
	if (!Object.keys(updateFields).length) {
		throw new NodeOperationError(
			this.getNode(),
			`Please enter at least one field to update for the ${resource}.`,
		);
	}
}
