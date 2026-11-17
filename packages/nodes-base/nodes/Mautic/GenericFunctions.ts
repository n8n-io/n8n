import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function mauticApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query?: IDataObject,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'credentials') as string;
	const credentialType = authenticationMethod === 'credentials' ? 'mauticApi' : 'mauticOAuth2Api';

	try {
		const credentials = await this.getCredentials(credentialType);
		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			headers: {},
			method,
			qs: query,
			uri: requestUrl`${credentials.url}/api${endpoint}`,
			body,
			json: true,
		};

		let returnData;

		if (authenticationMethod === 'credentials') {
			returnData = await this.helpers.requestWithAuthentication.call(this, 'mauticApi', options);
		} else {
			returnData = await this.helpers.requestOAuth2.call(this, 'mauticOAuth2Api', options, {
				includeCredentialsOnRefreshOnBody: true,
			});
		}

		if (returnData.errors) {
			// They seem to sometimes return 200 status but still error.
			throw new NodeApiError(this.getNode(), returnData as JsonObject);
		}

		return returnData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated mautic endpoint
 * and return all results
 */
export async function mauticApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 30;
	query.start = 0;

	do {
		responseData = await mauticApiRequest.call(this, method, endpoint, body, query);
		const values = Object.values(responseData[propertyName] as IDataObject[]);
		returnData.push.apply(returnData, values);
		query.start += query.limit;
	} while (
		responseData.total !== undefined &&
		returnData.length - parseInt(responseData.total as string, 10) < 0
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
