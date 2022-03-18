import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest
} from '../../transport';

export async function runOfflineUserDataJob(this: IExecuteFunctions, index: number, resourceName: string): Promise<IDataObject> {
	// https://developers.google.com/google-ads/api/reference/rpc/v9/RunOfflineUserDataJobRequest

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${resourceName}:run`;

	return await apiRequest.call(this, requestMethod, endpoint, undefined, qs);
}
