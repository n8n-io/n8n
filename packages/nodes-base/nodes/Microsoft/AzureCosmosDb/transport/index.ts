import type {
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import type { ICosmosDbCredentials } from '../helpers/interfaces';

export async function azureCosmosDbApiRequest(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	returnFullResponse: boolean = false,
): Promise<any> {
	const credentialsType = 'microsoftAzureCosmosDbSharedKeyApi';
	const credentials = await this.getCredentials<ICosmosDbCredentials>(credentialsType);

	const options: WithRequestTarget<IHttpRequestOptions> = {
		method,
		url: requestUrl`https://${credentials.account}.documents.azure.com/dbs/${credentials.database}${endpoint}`,
		json: true,
		headers,
		body,
		qs,
		returnFullResponse,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, options);
}
