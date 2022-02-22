import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	NodeOperationError
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const userListId = this.getNodeParameter('userListId', index) as string;
	const devToken = this.getNodeParameter('devToken', index) as string;
	const customerId = this.getNodeParameter('customerId', index) as string;
	const qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = `customers/${customerId}/userLists/${userListId}`;
	const headers = {
		'developer-token': devToken,
		'login-customer-id': customerId,
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, undefined, qs, undefined, headers);

	if (responseData.error) {
		throw new NodeOperationError(this.getNode(), responseData.error);
	}

	return this.helpers.returnJsonArray(responseData);
}
