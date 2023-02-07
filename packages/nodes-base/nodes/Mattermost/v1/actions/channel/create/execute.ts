import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function create(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'channels';

	const type = this.getNodeParameter('type', index) as string;

	body.team_id = this.getNodeParameter('teamId', index) as string;
	body.display_name = this.getNodeParameter('displayName', index) as string;
	body.name = this.getNodeParameter('channel', index) as string;
	body.type = type === 'public' ? 'O' : 'P';

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
