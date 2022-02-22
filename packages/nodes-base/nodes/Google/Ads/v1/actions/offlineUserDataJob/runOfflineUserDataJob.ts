import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../transport';

export async function runOfflineUserDataJob(this: IExecuteFunctions, index: number, resourceName: string): Promise<IDataObject> {
	// https://developers.google.com/google-ads/api/reference/rpc/v9/RunOfflineUserDataJobRequest

	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `${resourceName}:run`;

	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	return await apiRequest.call(this, requestMethod, endpoint, undefined, qs, undefined, headers);
}
