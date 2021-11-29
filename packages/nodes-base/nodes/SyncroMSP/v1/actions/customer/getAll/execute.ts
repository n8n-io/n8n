import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest, apiRequestAllItems
} from '../../../transport';


export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const perPage = this.getNodeParameter('per_page',index) as string;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'customers';
	const body = {} as IDataObject;

	if (additionalFields) {
		qs = additionalFields;
	}

	qs.per_page = perPage;

	let responseData;
	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	} else {
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData.customers);
	}
}
