import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';

export async function webflowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let credentialsType = 'webflowOAuth2Api';

	let options: IRequestOptions = {
		method,
		qs,
		body,
		uri: uri || `https://api.webflow.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	// Keep support for v1 node
	if (this.getNode().typeVersion === 1) {
		const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
		if (authenticationMethod === 'accessToken') {
			credentialsType = 'webflowApi';
		}
		options.headers = { 'accept-version': '1.0.0' };
	} else {
		options.resolveWithFullResponse = true;
		options.uri = `https://api.webflow.com/v2${resource}`;
	}

	if (Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}

export async function webflowApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await webflowApiRequest.call(this, method, endpoint, body, query);
		if (responseData.offset !== undefined) {
			query.offset += query.limit;
		}
		returnData.push.apply(returnData, responseData.items as IDataObject[]);
	} while (returnData.length < responseData.total);

	return returnData;
}
// Load Options
export async function getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await webflowApiRequest.call(this, 'GET', '/sites');

	const sites = response.body?.sites || response;

	for (const site of sites) {
		returnData.push({
			name: site.displayName || site.name,
			value: site.id || site._id,
		});
	}
	return returnData;
}
export async function getCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const siteId = this.getCurrentNodeParameter('siteId');
	const response = await webflowApiRequest.call(this, 'GET', `/sites/${siteId}/collections`);

	const collections = response.body?.collections || response;

	for (const collection of collections) {
		returnData.push({
			name: collection.displayName || collection.name,
			value: collection.id || collection._id,
		});
	}
	return returnData;
}
export async function getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const collectionId = this.getCurrentNodeParameter('collectionId');
	const response = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}`);

	const fields = response.body?.fields || response;

	for (const field of fields) {
		returnData.push({
			name: `${field.displayName || field.name} (${field.type}) ${field.isRequired || field.required ? ' (required)' : ''}`,
			value: field.slug,
		});
	}
	return returnData;
}
