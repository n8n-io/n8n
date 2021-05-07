import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	flow,
} from 'lodash';

export async function zohoApiRequest(
	this: IExecuteFunctions | IHookFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
	const operation = this.getNodeParameter('operation', 0) as string;

	const { oauthTokenData: { api_domain: apiDomain } } = this.getCredentials('zohoOAuth2Api') as { oauthTokenData: { api_domain: string} };

	const options: OptionsWithUri = {
		body: {
			data: [
				body,
			],
		},
		method,
		qs,
		uri: uri ?? `${apiDomain}/crm/v2${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(JSON.stringify(options, null, 2));
		const responseData = await this.helpers.requestOAuth2.call(this, 'zohoOAuth2Api', options);
		return operation === 'getAll' ? responseData : responseData.data;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an authenticated API request to Zoho CRM API and return all items.
 */
export async function zohoApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	qs.per_page = 200;
	qs.page = 0;

	do {
		responseData = await zohoApiRequest.call(this, method, endpoint, body, qs, uri);
		uri = responseData.info.more_records;
		returnData.push.apply(returnData, responseData['data']);
		qs.page++;
	} while (
		responseData.info.more_records !== undefined &&
		responseData.info.more_records === true
	);

	return returnData;
}

/**
 * Handle a Zoho CRM API listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', 0);

	if (returnAll) {
		return await zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const limit = this.getNodeParameter('limit', 0) as number;
	responseData = await zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	return responseData.slice(0, limit);
}

// ----------------------------------------
//            field adjusters
// ----------------------------------------

/**
 * Place a location field's contents at the top level of the payload.
 */
const adjustLocationFields = (locationType: LocationType) => (allFields: IDataObject) => {
	const locationField = allFields[locationType];
	if (!locationField || !hasAddressFields(locationField)) return allFields;

	return { ...omit(locationType, allFields), ...locationField.address_fields };
};

const adjustAddressFields = adjustLocationFields('Address');
const adjustBillingAddressFields = adjustLocationFields('Billing_Address');
const adjustMailingAddressFields = adjustLocationFields('Mailing_Address');
const adjustShippingAddressFields = adjustLocationFields('Shipping_Address');
const adjustOtherAddressFields = adjustLocationFields('Other_Address');

/**
 * Remove a date field's timestamp.
 */
const adjustDateField = (dateType: DateType) => (allFields: DateField) => {
	const dateField = allFields[dateType];

	if (!dateField) return allFields;

	allFields[dateType] = dateField.split('T')[0];

	return allFields;
};

const adjustDateOfBirthField = adjustDateField('Date_of_Birth');
const adjustClosingDateField = adjustDateField('Closing_Date');

export const adjustAccountFields = flow(adjustBillingAddressFields, adjustShippingAddressFields);
export const adjustContactFields = flow(adjustMailingAddressFields, adjustOtherAddressFields, adjustDateOfBirthField);
export const adjustDealFields = adjustClosingDateField;
export const adjustInvoiceFields = flow(adjustBillingAddressFields, adjustShippingAddressFields); // TODO: product details
export const adjustLeadFields = adjustAddressFields;
export const adjustPurchaseOrderFields = adjustInvoiceFields;
export const adjustQuoteFields = adjustInvoiceFields;
export const adjustSalesOrderFields = adjustInvoiceFields;

// ----------------------------------------
//               helpers
// ----------------------------------------

export const omit = (keyToOmit: string, { [keyToOmit]: _, ...omittedPropObj }) => omittedPropObj;

function hasAddressFields(locationField: unknown): locationField is LocationField {
	if (typeof locationField !== 'object' || locationField === null) return false;
	return locationField.hasOwnProperty('address_fields');
}

// ----------------------------------------
//               types
// ----------------------------------------

type LocationType = 'Address' | 'Billing_Address' | 'Mailing_Address' | 'Shipping_Address' | 'Other_Address';

type LocationField = {
	address_fields: { [key in LocationType]: string };
};

type DateType = 'Date_of_Birth' | 'Closing_Date';

type DateField = { Date_of_Birth?: string; Closing_Date?: string; };
