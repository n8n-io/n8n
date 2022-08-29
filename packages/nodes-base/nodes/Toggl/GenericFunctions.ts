import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	ITriggerFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function togglApiRequest(this: ITriggerFunctions | IPollFunctions | IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, resource: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('togglApi');
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` });

	const options: IHttpRequestOptions = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://api.track.toggl.com/api/v8${resource}`,
		body,
		json: true,
	};
	if (Object.keys(options.body!).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
