import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import flow from 'lodash.flow';
import sortBy from 'lodash.sortby';

import type {
	AllFields,
	CamelCaseResource,
	DateType,
	GetAllFilterOptions,
	IdType,
	LoadedFields,
	LoadedLayouts,
	LocationType,
	NameType,
	ProductDetails,
	ResourceItems,
	SnakeCaseResource,
	ZohoOAuth2ApiCredentials,
} from './types';

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	responseData: { data?: Array<{ status: string; message: string }> },
) {
	if (responseData?.data?.[0].status === 'error') {
		throw new NodeOperationError(this.getNode(), responseData as Error);
	}
}

export async function zohoApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
	const { oauthTokenData } = (await this.getCredentials(
		'zohoOAuth2Api',
	)) as ZohoOAuth2ApiCredentials;

	const options: OptionsWithUri = {
		body: {
			data: [body],
		},
		method,
		qs,
		uri: uri || `${oauthTokenData.api_domain}/crm/v2${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		const responseData = await this.helpers.requestOAuth2?.call(this, 'zohoOAuth2Api', options);

		if (responseData === undefined) return [];

		throwOnErrorStatus.call(this, responseData as IDataObject);

		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an authenticated API request to Zoho CRM API and return all items.
 */
export async function zohoApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	qs.per_page = 200;
	qs.page = 1;

	do {
		responseData = await zohoApiRequest.call(this, method, endpoint, body, qs);
		if (Array.isArray(responseData) && !responseData.length) return returnData;
		returnData.push(...(responseData.data as IDataObject[]));
		qs.page++;
	} while (responseData.info.more_records !== undefined && responseData.info.more_records === true);

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
	const returnAll = this.getNodeParameter('returnAll', 0);

	if (returnAll) {
		return zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await zohoApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0);

	return responseData.slice(0, limit);
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: CamelCaseResource) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}.`,
	);
}

export function throwOnMissingProducts(
	this: IExecuteFunctions,
	resource: CamelCaseResource,
	productDetails: ProductDetails,
) {
	if (!productDetails.length) {
		throw new NodeOperationError(
			this.getNode(),
			`Please enter at least one product for the ${resource}.`,
		);
	}
}

// ----------------------------------------
//        required field adjusters
// ----------------------------------------

/**
 * Create a copy of an object without a specific property.
 */
const omit = (propertyToOmit: string, { [propertyToOmit]: _, ...remainingObject }) =>
	remainingObject;

/**
 * Place a product ID at a nested position in a product details field.
 */
export const adjustProductDetails = (productDetails: ProductDetails) => {
	return productDetails.map((p) => {
		return {
			...omit('product', p),
			product: { id: p.id },
			quantity: p.quantity || 1,
		};
	});
};

// ----------------------------------------
//        additional field adjusters
// ----------------------------------------

/**
 * Place a product ID at a nested position in a product details field.
 *
 * Only for updating products from Invoice, Purchase Order, Quote, and Sales Order.
 */
export const adjustProductDetailsOnUpdate = (allFields: AllFields) => {
	if (!allFields.Product_Details) return allFields;

	return allFields.Product_Details.map((p) => {
		return {
			...omit('product', p),
			product: { id: p.id },
			quantity: p.quantity || 1,
		};
	});
};

/**
 * Place a location field's contents at the top level of the payload.
 */
const adjustLocationFields = (locationType: LocationType) => (allFields: AllFields) => {
	const locationField = allFields[locationType];

	if (!locationField) return allFields;

	return {
		...omit(locationType, allFields),
		...locationField.address_fields,
	};
};

const adjustAddressFields = adjustLocationFields('Address');
const adjustBillingAddressFields = adjustLocationFields('Billing_Address');
const adjustMailingAddressFields = adjustLocationFields('Mailing_Address');
const adjustShippingAddressFields = adjustLocationFields('Shipping_Address');
const adjustOtherAddressFields = adjustLocationFields('Other_Address');

/**
 * Remove from a date field the timestamp set by the datepicker.
 */
const adjustDateField = (dateType: DateType) => (allFields: AllFields) => {
	const dateField = allFields[dateType];

	if (!dateField) return allFields;

	allFields[dateType] = dateField.split('T')[0];

	return allFields;
};

const adjustDateOfBirthField = adjustDateField('Date_of_Birth');
const adjustClosingDateField = adjustDateField('Closing_Date');
const adjustInvoiceDateField = adjustDateField('Invoice_Date');
const adjustDueDateField = adjustDateField('Due_Date');
const adjustPurchaseOrderDateField = adjustDateField('PO_Date');
const adjustValidTillField = adjustDateField('Valid_Till');

/**
 * Place an ID field's value nested inside the payload.
 */
const adjustIdField = (idType: IdType, nameProperty: NameType) => (allFields: AllFields) => {
	const idValue = allFields[idType];

	if (!idValue) return allFields;

	return {
		...omit(idType, allFields),
		[nameProperty]: { id: idValue },
	};
};

const adjustAccountIdField = adjustIdField('accountId', 'Account_Name');
const adjustContactIdField = adjustIdField('contactId', 'Full_Name');
const adjustDealIdField = adjustIdField('dealId', 'Deal_Name');

const adjustCustomFields = (allFields: AllFields) => {
	const { customFields, ...rest } = allFields;

	if (!customFields?.customFields.length) return allFields;

	return customFields.customFields.reduce((acc, cur) => {
		acc[cur.fieldId] = cur.value;
		return acc;
	}, rest);
};

// ----------------------------------------
//           payload adjusters
// ----------------------------------------

export const adjustAccountPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustCustomFields,
);

export const adjustContactPayload = flow(
	adjustMailingAddressFields,
	adjustOtherAddressFields,
	adjustDateOfBirthField,
	adjustCustomFields,
);

export const adjustDealPayload = flow(adjustClosingDateField, adjustCustomFields);

export const adjustInvoicePayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustInvoiceDateField,
	adjustDueDateField,
	adjustAccountIdField,
	adjustCustomFields,
);

export const adjustInvoicePayloadOnUpdate = flow(
	adjustInvoicePayload,
	adjustProductDetailsOnUpdate,
);

export const adjustLeadPayload = flow(adjustAddressFields, adjustCustomFields);

export const adjustPurchaseOrderPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustDueDateField,
	adjustPurchaseOrderDateField,
	adjustCustomFields,
);

export const adjustQuotePayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustValidTillField,
	adjustCustomFields,
);

export const adjustSalesOrderPayload = flow(
	adjustBillingAddressFields,
	adjustShippingAddressFields,
	adjustDueDateField,
	adjustAccountIdField,
	adjustContactIdField,
	adjustDealIdField,
	adjustCustomFields,
);

export const adjustVendorPayload = flow(adjustAddressFields, adjustCustomFields);

export const adjustProductPayload = adjustCustomFields;

// ----------------------------------------
//               helpers
// ----------------------------------------

/**
 * Convert items in a Zoho CRM API response into n8n load options.
 */
export const toLoadOptions = (items: ResourceItems, nameProperty: NameType) =>
	items.map((item) => ({ name: item[nameProperty], value: item.id }));

export function getModuleName(resource: string) {
	const map: { [key: string]: string } = {
		account: 'Accounts',
		contact: 'Contacts',
		deal: 'Deals',
		invoice: 'Invoices',
		lead: 'Leads',
		product: 'Products',
		purchaseOrder: 'Purchase_Orders',
		salesOrder: 'Sales_Orders',
		vendor: 'Vendors',
		quote: 'Quotes',
	};

	return map[resource];
}

/**
 * Retrieve all fields for a resource, sorted alphabetically.
 */
export async function getFields(
	this: ILoadOptionsFunctions,
	resource: SnakeCaseResource,
	{ onlyCustom } = { onlyCustom: false },
) {
	const qs = { module: getModuleName(resource) };

	let { fields } = (await zohoApiRequest.call(
		this,
		'GET',
		'/settings/fields',
		{},
		qs,
	)) as LoadedFields;

	if (onlyCustom) {
		fields = fields.filter(({ custom_field }) => custom_field);
	}

	const options = fields.map(({ field_label, api_name }) => ({
		name: field_label,
		value: api_name,
	}));

	return sortBy(options, (o) => o.name);
}

export const capitalizeInitial = (str: string) => str[0].toUpperCase() + str.slice(1);

function getSectionApiName(resource: string) {
	if (resource === 'purchaseOrder') return 'Purchase Order Information';
	if (resource === 'salesOrder') return 'Sales Order Information';

	return `${capitalizeInitial(resource)} Information`;
}

export async function getPicklistOptions(
	this: ILoadOptionsFunctions,
	resource: string,
	targetField: string,
) {
	const qs = { module: getModuleName(resource) };
	const responseData = (await zohoApiRequest.call(
		this,
		'GET',
		'/settings/layouts',
		{},
		qs,
	)) as LoadedLayouts;

	const pickListOptions = responseData.layouts[0].sections
		.find((section) => section.api_name === getSectionApiName(resource))
		?.fields.find((f) => f.api_name === targetField)?.pick_list_values;

	if (!pickListOptions) return [];

	return pickListOptions.map((option) => ({
		name: option.display_value,
		value: option.actual_value,
	}));
}

/**
 * Add filter options to a query string object.
 */
export const addGetAllFilterOptions = (qs: IDataObject, options: GetAllFilterOptions) => {
	if (Object.keys(options).length) {
		const { fields, ...rest } = options;
		Object.assign(qs, fields && { fields: fields.join(',') }, rest);
	}
};
