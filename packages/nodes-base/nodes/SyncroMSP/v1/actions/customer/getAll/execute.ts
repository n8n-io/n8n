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
	const id = this.getNodeParameter('id', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'customers';
	const body = {} as IDataObject;

	if (id) {
		qs.id=id
	} else if (additionalFields) {
		qs = additionalFields;
	}

	let responseData;
	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData);
	} else {
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
		return this.helpers.returnJsonArray(responseData.customers);
	}
}
