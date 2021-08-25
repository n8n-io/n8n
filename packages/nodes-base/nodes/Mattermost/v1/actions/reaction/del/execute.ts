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

export async function del(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', index) as string;
	const postId = this.getNodeParameter('postId', index) as string;
	const emojiName = (this.getNodeParameter('emojiName', index) as string).replace(/:/g, '');

	const qs = {} as IDataObject;
	const requestMethod = 'DELETE';
	const endpoint = `users/${userId}/posts/${postId}/reactions/${emojiName}`;
	const body = {} as IDataObject;

	const returnData: IDataObject[] = [];
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	if (Array.isArray(responseData)) {
		returnData.push.apply(returnData, responseData);
	} else {
		returnData.push(responseData);
	}

	return this.helpers.returnJsonArray(returnData);
}