import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	CustomField,
	GeneralAddress,
	Ref,
} from './descriptions/Shared.interface';

import {
	pascalCase,
} from 'change-case';

import {
	pickBy,
} from 'lodash';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated API request to QuickBooks.
 */
export async function quickBooksApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let isDownload = false;

	if (['estimate', 'invoice', 'payment'].includes(resource) && operation === 'get') {
		isDownload = this.getNodeParameter('download', 0) as boolean;
	}

	const productionUrl = 'https://quickbooks.api.intuit.com';
	const sandboxUrl = 'https://sandbox-quickbooks.api.intuit.com';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: `${sandboxUrl}${endpoint}`,
		qs,
		body,
		json: !isDownload,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	if (isDownload) {
		options.headers!['Accept'] = 'application/pdf';
	}

	if (resource === 'invoice' && operation === 'send') {
		options.headers!['Content-Type'] = 'application/octet-stream';
	}

	if (resource === 'invoice' && (operation === 'void' || operation === 'delete')) {
		options.headers!['Content-Type'] = 'application/json';
	}

	try {
		console.log(JSON.stringify(options, null, 2));
		return await this.helpers.requestOAuth2!.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {

		const errors = error.error.Fault.Error;

		if (errors && Array.isArray(errors)) {
			const errorMessage = errors.map(
				(e) => `QuickBooks error response [${e.code}]: ${e.Message} - Detail: ${e.Detail}`,
			).join('|');

			throw new Error(errorMessage);
		}

		throw error;
	}
}

/**
 * Make an authenticated API request to QuickBooks and return all results.
 */
export async function quickBooksApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	resource: string,
	limit?: number,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	let startPosition = 1;
	const returnData: IDataObject[] = [];

	do {
		qs.query += ` MAXRESULTS 1000 STARTPOSITION ${startPosition}`;
		responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, body);
		returnData.push(...responseData.QueryResponse[pascalCase(resource)]);

		if (limit && returnData.length >= limit) {
			return returnData;
		}

		startPosition = responseData.maxResults + 1;

	} while (responseData.maxResults > returnData.length);

	return returnData;
}

/**
 * Handles a QuickBooks listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	resource: string,
): Promise<any> { // tslint:disable-line:no-any
	let responseData;

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const filters = this.getNodeParameter('filters', i) as IDataObject;
	if (filters.query) {
		qs.query += ` ${filters.query}`;
	}

	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
	} else {
		const limit = this.getNodeParameter('limit', i) as number;
		responseData = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource, limit);
		return responseData.splice(0, limit);
	}
}

/**
 * Get the SyncToken required for delete and void operations in QuickBooks.
 */
export async function getSyncToken(
	this: IExecuteFunctions,
	i: number,
	companyId: string,
	resource: string,
) {
	const resourceId = this.getNodeParameter(`${resource}Id`, i);
	const getEndpoint = `/v3/company/${companyId}/${resource}/${resourceId}`;
	const propertyName = pascalCase(resource);
	const { [propertyName]: { SyncToken } } = await quickBooksApiRequest.call(this, 'GET', getEndpoint, {}, {});

	return SyncToken;
}

/**
 * Get the reference and SyncToken required for update operations in QuickBooks.
 */
export async function getRefAndSyncToken(
	this: IExecuteFunctions,
	i: number,
	companyId: string,
	resource: string,
	ref: string,
) {
	const resourceId = this.getNodeParameter(`${resource}Id`, i);
	const endpoint = `/v3/company/${companyId}/${resource}/${resourceId}`;
	const responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

	return {
		ref: responseData[pascalCase(resource)][ref],
		syncToken: responseData[pascalCase(resource)].SyncToken,
	};

}

/**
 * Populate node items with binary data.
 */
export async function handleBinaryData(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	i: number,
	companyId: string,
	resource: string,
	itemId: string,
) {
	const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
	const endpoint = `/v3/company/${companyId}/${resource}/${itemId}/pdf`;
	const data = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {}, { encoding: null });

	items[i].binary = items[i].binary !== undefined ? items[i].binary : {};
	items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(data);

	return this.prepareOutputData(items);
}

export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: string,
) {
	const returnData: INodePropertyOptions[] = [];

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const { companyId } = this.getCredentials('quickBooksOAuth2Api') as { companyId: string };
	const endpoint = `/v3/company/${companyId}/query`;

	const resourceItems = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);

	resourceItems.forEach((resourceItem: { DisplayName: string, Id: string }) => {
		returnData.push({
			name: resourceItem.DisplayName,
			value: resourceItem.Id,
		});
	});

	return returnData;
}

/**
 * Populate the `Line` property in a request body.
 */
export function populateLineProperty(
	this: IExecuteFunctions,
	body: IDataObject,
	lines: IDataObject[],
	resource: string,
) {

	lines.forEach((line) => {
		if (resource === 'bill') {

			if (line.DetailType === 'AccountBasedExpenseLineDetail') {
				line.AccountBasedExpenseLineDetail = {
					AccountRef: {
						value: line.accountId,
					},
				};
				delete line.accountId;

			} else if (line.DetailType === 'ItemBasedExpenseLineDetail') {
				line.ItemBasedExpenseLineDetail = {
					ItemRef: {
						value: line.itemId,
					},
				};
				delete line.itemId;
			}
		} else if (resource === 'estimate') {

			if (line.DetailType === 'SalesItemLineDetail') {

				line.SalesItemLineDetail = {
					ItemRef: {
						value: line.itemId,
					},
				};
				delete line.itemId;

			}

		}
	});

	body.Line = lines;
	return body;
}

/**
 * Populate update fields or additional fields into a request body.
 */
export function populateFields(
	this: IExecuteFunctions,
	body: IDataObject,
	fields: IDataObject,
	resource: string,
) {

	Object.entries(fields).forEach(([key, value]) => {

		if (resource === 'bill') {

			if (key.endsWith('Ref')) {
				const { details } = value as { details: Ref };
				body[key] = {
					name: details.name,
					value: details.value,
				};

			} else {
				body[key] = value;
			}

		} else if (['customer', 'employee', 'vendor'].includes(resource)) {

			if (key === 'BillAddr') {
				const { details } = value as { details: GeneralAddress };
				body.BillAddr = pickBy(details, detail => detail !== '');

			} else if (key === 'PrimaryEmailAddr') {
				body.PrimaryEmailAddr = {
					Address: value,
				};

			} else if (key === 'PrimaryPhone') {
				body.PrimaryPhone = {
					FreeFormNumber: value,
				};

			} else {
				body[key] = value;
			}

		} else if (resource === 'estimate' || resource === 'invoice') {

			if (key === 'BillAddr' || key === 'ShipAddr') {
				const { details } = value as { details: GeneralAddress };
				body[key] = pickBy(details, detail => detail !== '');

			} else if (key === 'BillEmail') {
				body.BillEmail = {
					Address: value,
				};

			} else if (key === 'CustomFields') {
				const { Field } = value as { Field: CustomField[] };
				body.CustomField = Field;

			} else if (key === 'CustomerMemo') {
				body.CustomerMemo = {
					value,
				};

			} else if (key.endsWith('Ref')) {
				const { details } = value as { details: Ref };
				body[key] = {
					name: details.name,
					value: details.value,
				};

			} else if (key === 'TotalTax') {
				body.TxnTaxDetail = {
					TotalTax: value,
				};

			} else {
				body[key] = value;
			}

		} else if (resource === 'payment') {
			body[key] = value;
		}

	});

	return body;
}
