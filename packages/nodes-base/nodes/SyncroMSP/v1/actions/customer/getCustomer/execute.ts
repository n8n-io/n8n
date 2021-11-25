import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../../transport';


export async function getCustomer(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('id', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'customers';
	const body = {} as IDataObject;

	if (additionalFields) {
		qs = additionalFields;
	}
	qs.id=id;

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData.customers);
}
