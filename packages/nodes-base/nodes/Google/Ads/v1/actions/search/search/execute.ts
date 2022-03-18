import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

import {
	mapObjectsToArray,
	simplify,
} from '../../../methods';

export async function search(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// https://developers.google.com/google-ads/api/rest/common/search

	const customerId = this.getNodeParameter('customerId', index) as string;
	const queryGQL = this.getNodeParameter('queryGQL', index) as string;
	const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${customerId}/googleAds:search`;

	const form = {
		query: queryGQL,
	};

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);

	if (simplifyOutput) {
		responseData = simplify(responseData);
		responseData = mapObjectsToArray(responseData);
	}
	return this.helpers.returnJsonArray(responseData);
}
