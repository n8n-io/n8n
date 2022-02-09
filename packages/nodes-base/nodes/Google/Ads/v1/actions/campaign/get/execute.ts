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
	const campaignId = this.getNodeParameter('campaignId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const customerId = this.getNodeParameter('customerId', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/googleAds:search`;
	const form = {
		query: `SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.id DESC WHERE campaign.id = ${campaignId}`,
	} as IDataObject;
	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);

	return this.helpers.returnJsonArray(responseData);
}
