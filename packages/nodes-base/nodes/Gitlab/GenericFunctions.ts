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

/**
 * Make an API request to Gitlab
 *
 */
export async function gitlabApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	query?: IDataObject,
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);
	const credentialType = authenticationMethod === 'accessToken' ? 'gitlabApi' : 'gitlabOAuth2Api';

	try {
		const credentials = await this.getCredentials(credentialType);
		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			method,
			headers: {},
			body,
			qs: query,
			uri: requestUrl`${credentials.server}/api/v4${endpoint}`,
			json: true,
		};

		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		if (query === undefined) {
			delete options.qs;
		}

		if (authenticationMethod === 'accessToken') {
			return await this.helpers.requestWithAuthentication.call(this, 'gitlabApi', options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'gitlabOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function gitlabApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await gitlabApiRequest.call(this, method, endpoint, body as IDataObject, query, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (responseData.headers.link?.includes('next'));
	return returnData;
}
