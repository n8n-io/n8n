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


export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	let qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'rmm_alerts';
	const body = {} as IDataObject;

	if (additionalFields) {
		qs = additionalFields;
	}

	let responseData;
	responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData.rmm_alerts);
}
