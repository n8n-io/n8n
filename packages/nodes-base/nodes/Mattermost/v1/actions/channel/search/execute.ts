import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function search(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const teamId = this.getNodeParameter('teamId', index);
	const returnAll = this.getNodeParameter('returnAll', 0);
	const endpoint = `teams/${teamId}/channels/search`;

	body.term = this.getNodeParameter('term', index) as string;

	let responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	if (!returnAll) {
		const limit = this.getNodeParameter('limit', 0);
		responseData = responseData.slice(0, limit);
	}

	return this.helpers.returnJsonArray(responseData);
}
