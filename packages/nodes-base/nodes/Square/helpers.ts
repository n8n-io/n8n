import flow from 'lodash/flow';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

/**
 * Make an API request to Square
 *
 */
export async function squareApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
) {
	const options = {
		method,
		body,
		qs: query,
		uri: `https://connect.squareup.com/v2${endpoint}`,
		json: true,
		headers: {
			'Content-Type': 'application/json',
		},
	} satisfies IRequestOptions;

	console.log('Square API Request:', {
		method,
		endpoint,
		fullUrl: options.uri,
		body,
		query,
	});

	if (options.qs && Object.keys(options.qs).length === 0) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.requestWithAuthentication.call(this, 'squareApi', options);
		console.log('Square API Response:', response);
		return response;
	} catch (error) {
		if (error.response?.status === 404) {
			if (endpoint.includes('/customers/')) {
				const customerId = endpoint.split('/customers/')[1];
				return {
					error: {
						message: `Customer with ID "${customerId}" was not found. Please check if the customer ID exists in your Square account.`,
						code: 'CUSTOMER_NOT_FOUND',
					},
				};
			}
		}

		// Handle other common Square API errors
		if (error.response?.data?.errors?.[0]) {
			const squareError = error.response.data.errors[0];
			throw new Error(`Square API Error: ${squareError.detail || squareError.category}`);
		}

		throw error;
	}
}

export async function squareApiRequestAllItems(
	this: IExecuteFunctions,
	resource: string,
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await squareApiRequest.call(this, 'GET', `/${resource}s`, {}, qs);
		returnData.push(...(responseData.data as IDataObject[]));
	} while (responseData.has_more);

	return returnData;
}

/**
 * Convert n8n's address object into a Stripe API request shipping object.
 */
function adjustAddress(addressFields: { address: { details: IDataObject } }) {
	if (!addressFields.address) return addressFields;

	return {
		...omit(addressFields, ['address']),
		address: addressFields.address.details,
	};
}

/**
 * Convert n8n's `fixedCollection` metadata object into a Stripe API request metadata object.
 */
export function adjustMetadata(fields: {
	metadata?: { metadataProperties: Array<{ key: string; value: string }> };
}) {
	if (!fields.metadata || isEmpty(fields.metadata)) return fields;

	const adjustedMetadata: Record<string, string> = {};

	fields.metadata.metadataProperties.forEach((pair) => {
		adjustedMetadata[pair.key] = pair.value;
	});

	return {
		...omit(fields, ['metadata']),
		metadata: adjustedMetadata,
	};
}

/**
 * Convert n8n's shipping object into a Stripe API request shipping object.
 */
function adjustShipping(shippingFields: {
	shipping?: { shippingProperties: Array<{ address: { details: IDataObject }; name: string }> };
}) {
	const shippingProperties = shippingFields.shipping?.shippingProperties[0];

	if (!shippingProperties?.address || isEmpty(shippingProperties.address)) return shippingFields;

	return {
		...omit(shippingFields, ['shipping']),
		shipping: {
			...omit(shippingProperties, ['address']),
			address: shippingProperties.address.details,
		},
	};
}

/**
 * Make n8n's charge fields compliant with the Stripe API request object.
 */
export const adjustChargeFields = flow([adjustShipping, adjustMetadata]);

/**
 * Make n8n's customer fields compliant with the Stripe API request object.
 */
export const adjustCustomerFields = flow([adjustShipping, adjustAddress, adjustMetadata]);

/**
 * Load a resource so it can be selected by name from a dropdown.
 */
export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: 'charge' | 'customer' | 'source',
): Promise<INodePropertyOptions[]> {
	const responseData = await squareApiRequest.call(this, 'GET', `/${resource}s`, {}, {});

	return responseData.data.map(({ name, id }: { name: string; id: string }) => ({
		name,
		value: id,
	}));
}

/**
 * Handles a Stripe listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	resource: string,
	i: number,
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);
	const limit = this.getNodeParameter('limit', i, 0);

	do {
		responseData = await squareApiRequest.call(this, 'GET', `/${resource}s`, {}, qs);
		returnData.push(...(responseData.data as IDataObject[]));

		if (!returnAll && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		qs.starting_after = returnData[returnData.length - 1].id;
	} while (responseData.has_more);

	return returnData;
}
