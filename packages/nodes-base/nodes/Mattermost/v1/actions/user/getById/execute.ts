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

export async function getById(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'users/ids';
	const userIds = (this.getNodeParameter('userIds', index) as string).split(',') as string[];
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const body = userIds;

	if (additionalFields.since) {
		qs.since = new Date(additionalFields.since as string).getTime();
	}

	const returnData: IDataObject[] = [];
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	if (Array.isArray(responseData)) {
		returnData.push.apply(returnData, responseData);
	} else {
		returnData.push(responseData);
	}

	return this.helpers.returnJsonArray(returnData);
}