import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function del(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const channelId = this.getNodeParameter('channelId', index) as string;

	const body = {} as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'DELETE';
	const endpoint = `channels/${channelId}`;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
