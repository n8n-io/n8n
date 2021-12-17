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
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function togglApiRequest(this: ITriggerFunctions | IPollFunctions | IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('togglApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` });

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://api.track.toggl.com/api/v8${resource}`,
		body,
		json: true,
	};
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
