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
	simplify
} from '../../../methods';

export async function deleteOpr(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// https://developers.google.com/google-ads/api/rest/reference/rest/v9/customers.userLists/mutate

	const customerId = this.getNodeParameter('customerId', index) as string;
	const userListResourceName = this.getNodeParameter('userListResourceName', index) as string;
	const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${customerId}/userLists:mutate`;

	const form = {
		operations: [
			{
				remove: userListResourceName,
			},
		],
	} as IDataObject;

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);
	if (simplifyOutput) {
		responseData = simplify(responseData);
	}

	return this.helpers.returnJsonArray(responseData);
}
