import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHookFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

export type TeamsCredentialType = 'microsoftTeamsOAuth2Api' | 'microsoftOAuth2Api';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftTeamsOAuth2Api` so existing workflows (and nodes saved
 * before the `authentication` selector existed) keep working unchanged, while
 * allowing the generic `microsoftOAuth2Api` (Graph) credential to be selected.
 *
 * Shared by the action node (v2), its `listSearch` helpers and the Trigger's
 * webhook hooks, since all of them authenticate through `microsoftApiRequest`.
 */
export function getTeamsCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
): TeamsCredentialType {
	// `0` is the execute item index; in load-options getNodeParameter has no itemIndex
	// arg, so don't switch this to the 3-arg `(name, itemIndex, default)` form. Anything
	// other than the generic value (incl. legacy nodes) resolves to the Teams credential.
	return this.getNodeParameter('authentication', 0) === 'microsoftOAuth2Api'
		? 'microsoftOAuth2Api'
		: 'microsoftTeamsOAuth2Api';
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const credentialType = getTeamsCredentialType.call(this);
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseUrl}${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		const errorOptions: IDataObject = {};
		if (error.error?.error) {
			const httpCode = error.statusCode;
			error = error.error.error;
			error.statusCode = httpCode;
			errorOptions.message = error.message;

			if (error.code === 'NotFound' && error.message === 'Resource not found') {
				const nodeResource = capitalize(this.getNodeParameter('resource', 0) as string);
				errorOptions.message = `${nodeResource} not found`;
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}
