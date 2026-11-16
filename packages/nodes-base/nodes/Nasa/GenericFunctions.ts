import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function nasaApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject,
	option: Pick<IRequestOptions, 'encoding'> = {},
	uri?: string,
): Promise<any> {
	const credentials = await this.getCredentials('nasaApi');

	qs.api_key = credentials.api_key as string;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		qs,
		uri: requestUrl`https://api.nasa.gov${endpoint}`,
		json: true,
	};

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request(uri ? { ...options, uri } : options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function nasaApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: RequestPath,
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.size = 20;

	let uri: string | undefined = undefined;

	do {
		responseData = await nasaApiRequest.call(this, method, resource, query, {}, uri);
		uri = responseData.links.next;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.links.next !== undefined);

	return returnData;
}
