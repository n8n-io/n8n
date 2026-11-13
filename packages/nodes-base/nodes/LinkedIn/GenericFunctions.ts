import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';
function resolveHeaderData(fullResponse: any) {
	if (fullResponse.statusCode === 201) {
		return { urn: fullResponse.headers['x-restli-id'] };
	} else {
		return fullResponse.body;
	}
}

export async function linkedInApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath | string,

	body: any = {},
	binary?: boolean,
	_headers?: object,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);
	const credentialType =
		authenticationMethod === 'standard'
			? 'linkedInOAuth2Api'
			: 'linkedInCommunityManagementOAuth2Api';

	const baseUrl = 'https://api.linkedin.com';

	let options: LegacyRequestOptions = {
		headers: {
			Accept: 'application/json',
			'X-Restli-Protocol-Version': '2.0.0',
			'LinkedIn-Version': '202504',
		},
		method,
		body,
		...(typeof endpoint === 'string'
			? { url: endpoint }
			: {
					url: endpoint.value.includes('v2')
						? requestUrl`${baseUrl}${endpoint}`
						: requestUrl`${baseUrl}/rest${endpoint}`,
				}),
		json: true,
	};

	options = Object.assign({}, options, {
		resolveWithFullResponse: true,
	});
	// If uploading binary data
	if (binary) {
		delete options.json;
		options.encoding = null;
		if (Object.keys(_headers as object).length > 0) {
			Object.assign(options.headers as object, _headers);
		}
	}

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return resolveHeaderData(
			await this.helpers.requestOAuth2.call(this, credentialType, options, {
				tokenType: 'Bearer',
			}),
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
