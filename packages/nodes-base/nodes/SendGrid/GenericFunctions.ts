import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';

export async function sendGridApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,

	body: any = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const host = 'api.sendgrid.com/v3';

	const options: IRequestOptions = {
		method,
		qs,
		body,
		uri: `https://${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.requestWithAuthentication.call(this, 'sendGridApi', options);
}

export async function sendGridApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,
	propertyName: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	let uri;

	do {
		responseData = await sendGridApiRequest.call(this, endpoint, method, body, query, uri); // possible bug, as function does not have uri parameter
		uri = responseData._metadata.next;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const limit = query.limit as number | undefined;
		if (limit && returnData.length >= limit) {
			return returnData;
		}
	} while (responseData._metadata.next !== undefined);

	return returnData;
}
