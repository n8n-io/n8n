import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	ITriggerFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function togglApiRequest(
	this:
		| ITriggerFunctions
		| IPollFunctions
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	query?: IDataObject,
	uri?: string,
) {
	const credentials = await this.getCredentials('togglApi');
	const headerWithAuthentication = Object.assign(
		{},
		{
			Authorization: ` Basic ${Buffer.from(
				`${credentials.username}:${credentials.password}`,
			).toString('base64')}`,
		},
	);

	const options: IRequestOptions = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://api.track.toggl.com/api/v8${resource}`,
		body,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
