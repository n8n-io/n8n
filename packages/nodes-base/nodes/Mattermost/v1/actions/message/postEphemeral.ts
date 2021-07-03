import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../transport';

export async function postEphemeral(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `posts/ephemeral`;
	
	const body = {
		user_id: this.getNodeParameter('userId', index),
		post: {
			channel_id: this.getNodeParameter('channelId', index),
			message: this.getNodeParameter('message', index),
		},
	} as IDataObject;
	
	const returnData: IDataObject[] = [];
	
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	
	if (Array.isArray(responseData)) {
		returnData.push.apply(returnData, responseData);
	} else {
		returnData.push(responseData);
	}
	
	return this.helpers.returnJsonArray(returnData);
}