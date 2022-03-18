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

export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('googleAdsOAuth2Api') as IDataObject;
	const customerId = credentials.customerId as string;
	const limit = this.getNodeParameter('limit', 0, 0) as number;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/customers/${customerId}/googleAds:search`;
	const form = {
		query: 'SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC',
	} as IDataObject;

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);
	if (limit > 0) {
		responseData = responseData.slice(0, limit);
	}
	return this.helpers.returnJsonArray(responseData);
}
