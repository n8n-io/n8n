import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function create(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'reactions';
	const body = {
		user_id: this.getNodeParameter('userId', index),
		post_id: this.getNodeParameter('postId', index),
		emoji_name: (this.getNodeParameter('emojiName', index) as string).replace(/:/g, ''),
		create_at: Date.now(),
	} as { user_id: string; post_id: string; emoji_name: string; create_at: number };

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
