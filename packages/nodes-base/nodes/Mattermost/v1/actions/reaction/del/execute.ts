import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function del(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', index) as string;
	const postId = this.getNodeParameter('postId', index) as string;
	const emojiName = (this.getNodeParameter('emojiName', index) as string).replace(/:/g, '');

	const qs = {} as IDataObject;
	const requestMethod = 'DELETE';
	const endpoint = `users/${userId}/posts/${postId}/reactions/${emojiName}`;
	const body = {} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
