import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../transport';

export async function createOfflineUserDataJob(this: IExecuteFunctions, index: number): Promise<IDataObject> {
	// https://developers.google.com/google-ads/api/reference/rpc/v9/CreateOfflineUserDataJobRequest

	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const userListResourceName = this.getNodeParameter('userListResourceName', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/offlineUserDataJobs:create`;

	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const form = {
		job: {
			type: 'CUSTOMER_MATCH_USER_LIST',
			customerMatchUserListMetadata: {
				userList: userListResourceName,
			},
		},
	} as IDataObject;

	return await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);
}
