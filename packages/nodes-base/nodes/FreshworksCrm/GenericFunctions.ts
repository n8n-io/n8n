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
	Attendees,
	FreshworksConfigResponse,
	FreshworksCrmApiCredentials,
} from './types';

import {
	omit,
} from 'lodash';

export async function freshworksCrmApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { apiKey, domain } = this.getCredentials('freshworksCrmApi') as FreshworksCrmApiCredentials;

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Token token=${apiKey}`,
		},
		method,
		body,
		qs,
		uri: `https://${domain}.myfreshworks.com/crm/sales/api${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(options);
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function freshworksCrmApiRequestAllItems(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	// tslint:disable-next-line: no-any
	let responseData: any;

	do {
		responseData = await freshworksCrmApiRequest.call(this, method, endpoint, body, qs);
		// TODO: Get next page
		returnData.push(...responseData);
	} while (
		false // TODO: Add condition for total not yet reached
	);

	return returnData;
}

export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (returnAll) {
		return await freshworksCrmApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await freshworksCrmApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0) as number;

	return responseData.slice(0, limit);
}

/**
 * Load resources for options, except users.
 *
 * See: https://developers.freshworks.com/crm/api/#admin_configuration
 */
export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: string,
) {
	const response = await freshworksCrmApiRequest.call(
		this, 'GET', `/selector/${resource}`,
	) as FreshworksConfigResponse<LoadedResource>;

	const key = Object.keys(response)[0];

	if (resource === 'sales_activity') console.log(response);

	return response[key].map(({ name, id }) => ({ name, value: id }));
}

/**
 * Adjust attendee data from n8n UI to the format expected by Freshworks CRM API.
 */
export function adjustAttendees(additionalFields: IDataObject & Attendees) {
	if (!additionalFields?.appointment_attendees_attributes) return additionalFields;

	return {
		...omit(additionalFields, ['appointment_attendees_attributes']),
		appointment_attendees_attributes: additionalFields.appointment_attendees_attributes.map(attendeeId => {
			return { type: 'user', id: attendeeId };
		}),
	};
}

export function throwOnEmptyUpdate(
	this: IExecuteFunctions,
	resource: string,
) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}.`,
	);
}
