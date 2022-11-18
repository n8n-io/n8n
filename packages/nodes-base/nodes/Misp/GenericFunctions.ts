import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, ILoadOptionsFunctions, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

import { MispCredentials } from './types';

import { URL } from 'url';

export async function mispApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { baseUrl, apiKey, allowUnauthorizedCerts } = (await this.getCredentials(
		'mispApi',
	)) as MispCredentials;

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
		// MISP API wrongly returns 403 for malformed requests
		if (error.statusCode === 403) {
			error.statusCode = 400;
		}

		const errors = error?.error?.errors;

		if (errors) {
			const key = Object.keys(errors)[0];

			if (key !== undefined) {
				let message = errors[key].join();

				if (message.includes(' nter')) {
					message = message.replace(' nter', ' enter');
				}

				error.error.message = `${error.error.message}: ${message}`;
			}
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export async function mispApiRequestAllItems(this: IExecuteFunctions, endpoint: string) {
	const responseData = await mispApiRequest.call(this, 'GET', endpoint);
	const returnAll = this.getNodeParameter('returnAll', 0);

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

const SHARING_GROUP_OPTION_ID = 4;

export function throwOnMissingSharingGroup(this: IExecuteFunctions, fields: IDataObject) {
	if (fields.distribution === SHARING_GROUP_OPTION_ID && !fields.sharing_group_id) {
		throw new NodeOperationError(this.getNode(), 'Please specify a sharing group');
	}
}

const isValidUrl = (str: string) => {
	try {
		new URL(str); // tslint:disable-line: no-unused-expression
		return true;
	} catch (error) {
		return false;
	}
};

export function throwOnInvalidUrl(this: IExecuteFunctions, str: string) {
	if (!isValidUrl(str)) {
		throw new NodeOperationError(
			this.getNode(),
			'Please specify a valid URL, protocol included. Example: https://site.com',
		);
	}
}
