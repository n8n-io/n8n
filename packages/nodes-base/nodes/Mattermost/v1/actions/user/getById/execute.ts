import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function getById(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'users/ids';
	const userIds = (this.getNodeParameter('userIds', index) as string).split(',');
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const body = userIds;

	if (additionalFields.since) {
		qs.since = new Date(additionalFields.since as string).getTime();
	}

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
