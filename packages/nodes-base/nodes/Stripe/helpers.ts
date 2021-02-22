import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	flow,
	isEmpty,
	omit,
} from 'lodash';

import { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/**
 * Make an API request to Stripe
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function stripeApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('stripeApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
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

	if (!options.qs) {
		delete options.qs;
	}

	try {
		console.log(JSON.stringify(options, null, 2));
		return await this.helpers.request!.call(this, options);
	} catch (error) {
		// console.log(error);
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Stripe credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Stripe error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

/**
 * Adjust n8n's fields into fields compliant with the Stripe API request object.
 */
export const adjustCustomerFields = flow([
	adjustAddressFields,
	adjustMetadataFields,
	adjustShippingFields,
]);

/**
 * Convert n8n's shipping object into a Stripe API request shipping object.
 */
function adjustShippingFields(
	shippingFields: { shipping?: { shippingProperties: Array<{ address: { details: IDataObject }; name: string }> }  },
) {
	const shippingProperties = shippingFields.shipping?.shippingProperties[0];

	if (!shippingProperties?.address || isEmpty(shippingProperties.address)) return shippingFields;

	return {
		shipping: {
			...omit(shippingProperties, ['address']),
			address: shippingProperties.address.details,
		},
	};
}

/**
 * Convert n8n's address object into a Stripe API request shipping object.
 */
function adjustAddressFields(
	addressFields: { address: { details: IDataObject }  },
) {

	return {
		address: addressFields.address.details,
	};

}

/**
 * Convert n8n's `fixedCollection` metadata object into a Stripe API request metadata object.
 */
function adjustMetadataFields(
	customerFields: { metadata?: { metadataProperties: Array<{ key: string; value: string }> } },
) {
	if (!customerFields.metadata || isEmpty(customerFields.metadata)) return customerFields;

	let adjustedMetadata = {};

	customerFields.metadata.metadataProperties.forEach(pair => {
		adjustedMetadata = { ...adjustedMetadata, ...pair };
	});

	return {
		...omit(customerFields, ['metadata']),
		metadata: adjustedMetadata,
	};
}

/**
 * Load a resource so it can be selected by name from a dropdown.
 */
export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: 'charge' | 'customer',
): Promise<INodePropertyOptions[]> {
	const responseData = await stripeApiRequest.call(this, 'GET', `/${resource}s`, {}, {});

	return responseData.data.map(({ name, id }: { name: string, id: string }) => ({
		name,
		value: id,
	}));
}
