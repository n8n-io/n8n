import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from '../../../transport';

export async function getAll(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index);

	const qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'contacts';
	const body = {} as IDataObject;

	let responseData;
	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	} else {
		const limit = this.getNodeParameter('limit', index);
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData.contacts.splice(0, limit));
	}
}
