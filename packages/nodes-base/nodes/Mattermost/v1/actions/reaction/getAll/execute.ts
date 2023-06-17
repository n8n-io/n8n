import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function getAll(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const postId = this.getNodeParameter('postId', index) as string;
	const limit = this.getNodeParameter('limit', 0, 0);

	const qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = `posts/${postId}/reactions`;
	const body = {} as IDataObject;

	let responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	if (limit > 0) {
		responseData = responseData.slice(0, limit);
	}
	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
