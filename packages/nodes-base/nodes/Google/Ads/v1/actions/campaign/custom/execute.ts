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

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const queryGQL = this.getNodeParameter('queryGQL', index) as string;
	const customerId = this.getNodeParameter('customerId', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/googleAds:search`;
	const form = {
		query: queryGQL,
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);

	return this.helpers.returnJsonArray(responseData);
}
