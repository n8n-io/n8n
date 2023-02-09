import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function postEphemeral(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'posts/ephemeral';

	const body = {
		user_id: this.getNodeParameter('userId', index),
		post: {
			channel_id: this.getNodeParameter('channelId', index),
			message: this.getNodeParameter('message', index),
		},
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
