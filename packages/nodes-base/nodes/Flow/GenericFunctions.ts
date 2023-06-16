import type { OptionsWithUri } from 'request';
import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function flowApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('flowApi');

	let options: OptionsWithUri = {
		headers: { Authorization: `Bearer ${credentials.accessToken}` },
		method,
		qs,
		body,
		uri: uri || `https://api.getflow.com/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function FlowApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;

	let uri: string | undefined;

	do {
		responseData = await flowApiRequest.call(this, method, resource, body, query, uri, {
			resolveWithFullResponse: true,
		});
		uri = responseData.headers.link;
		// @ts-ignore
		returnData.push.apply(returnData, responseData.body[propertyName] as IDataObject[]);
	} while (responseData.headers.link !== undefined && responseData.headers.link !== '');

	return returnData;
}
