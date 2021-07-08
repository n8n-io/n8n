import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	flow,
	isEmpty,
	omit,
} from 'lodash';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

/**
 * Make an API request to Stripe
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function stripeApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: object,
) {
	const credentials = this.getCredentials('stripeApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const options = {
		method,
		auth: {
			user: credentials.secretKey as string,
		},
		form: body,
		qs: query,
		uri: `https://api.stripe.com/v1${endpoint}`,
		json: true,
	};

	if (options.qs && Object.keys(options.qs).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make n8n's charge fields compliant with the Stripe API request object.
 */
export const adjustChargeFields = flow([
	adjustShipping,
	adjustMetadata,
]);

/**
 * Make n8n's customer fields compliant with the Stripe API request object.
 */
export const adjustCustomerFields = flow([
	adjustShipping,
	adjustAddress,
	adjustMetadata,
]);

/**
 * Convert n8n's address object into a Stripe API request shipping object.
 */
function adjustAddress(
	addressFields: { address: { details: IDataObject } },
) {
	if (!addressFields.address) return addressFields;

	return {
		...omit(addressFields, ['address']),
		address: addressFields.address.details,
	};
}

/**
 * Convert n8n's `fixedCollection` metadata object into a Stripe API request metadata object.
 */
export function adjustMetadata(
	fields: { metadata?: { metadataProperties: Array<{ key: string; value: string }> } },
) {
	if (!fields.metadata || isEmpty(fields.metadata)) return fields;

	let adjustedMetadata = {};

	fields.metadata.metadataProperties.forEach(pair => {
		adjustedMetadata = { ...adjustedMetadata, ...pair };
	});

	return {
		...omit(fields, ['metadata']),
		metadata: adjustedMetadata,
	};
}

/**
 * Convert n8n's shipping object into a Stripe API request shipping object.
 */
function adjustShipping(
	shippingFields: { shipping?: { shippingProperties: Array<{ address: { details: IDataObject }; name: string }> } },
) {
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
 * Load a resource so it can be selected by name from a dropdown.
 */
export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: 'charge' | 'customer' | 'source',
): Promise<INodePropertyOptions[]> {
	const responseData = await stripeApiRequest.call(this, 'GET', `/${resource}s`, {}, {});

	return responseData.data.map(({ name, id }: { name: string, id: string }) => ({
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
	qs: IDataObject = {},
) {
	let responseData;

	responseData = await stripeApiRequest.call(this, 'GET', `/${resource}s`, qs, {});
	responseData = responseData.data;

	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (!returnAll) {
		const limit = this.getNodeParameter('limit', 0) as number;
		responseData = responseData.slice(0, limit);
	}

	return responseData;
}
