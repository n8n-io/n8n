import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, decodePathValue, requestPath, requestUrl } from 'n8n-workflow';

function objectPath(resource: string, decode: boolean): RequestPath {
	return resource
		.split('/')
		.reduce(
			(path, part) =>
				part
					? requestPath`${path}/${decode ? decodePathValue(part) : part}`
					: requestPath`${path}/`,
			requestPath``,
		);
}

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	projectId: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	uri: RequestUrl | null = null,
): Promise<any> {
	const { region } = await this.getCredentials('googleFirebaseRealtimeDatabaseOAuth2Api');
	const decode = this.getNode().typeVersion < 1.1;

	const options: WithRequestTarget<IRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: uri ?? requestUrl`https://${projectId}.${region}${objectPath(resource, decode)}.json`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(
			this,
			'googleFirebaseRealtimeDatabaseOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	projectId: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	_headers: IDataObject = {},
	uri: RequestUrl | null = null,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	qs.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(
			this,
			projectId,
			method,
			resource,
			body,
			qs,
			{},
			uri,
		);
		qs.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[resource] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
