import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

export async function theHiveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject | FormData = {},
	query: IDataObject = {},
	uri?: RequestUrl,
	option: Pick<
		IRequestOptions,
		'formData' | 'useStream' | 'resolveWithFullResponse' | 'encoding' | 'json'
	> & { Headers?: IDataObject } = {},
) {
	const credentials = await this.getCredentials('theHiveProjectApi');

	let options: WithRequestTarget<IHttpRequestOptions> = {
		method,
		qs: query,
		url: uri ?? requestUrl`${credentials.url}/api${resource}`,
		body,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts as boolean,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	return await this.helpers.requestWithAuthentication.call(this, 'theHiveProjectApi', options);
}
