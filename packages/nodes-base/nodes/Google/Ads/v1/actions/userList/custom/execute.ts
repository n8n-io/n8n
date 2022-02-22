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
} from '../../../methods/simplify';

export async function custom(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const customerId = this.getNodeParameter('customerId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const queryGQL = this.getNodeParameter('queryGQL', index) as string;
	const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `customers/${customerId}/googleAds:search`;
	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const
		form = {
			query: queryGQL,
		};

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs, undefined, headers);

	if (simplifyOutput) {
		responseData = simplify(responseData);
	}
	return this.helpers.returnJsonArray(responseData);
}
