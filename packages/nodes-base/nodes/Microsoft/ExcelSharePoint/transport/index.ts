import type { IDataObject, IHttpRequestMethods, IHttpRequestOptions } from 'n8n-workflow';

import { buildRequestOptions } from '../helpers/converters';
import { getExcelSharePointCredentialType } from '../helpers/credentials';
import { getErrorMapper } from '../helpers/errorMappers';
import type { AuthContext } from '../helpers/interfaces';

export async function microsoftApiRequest<T extends IDataObject = IDataObject>(
	this: AuthContext,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<T> {
	const credentialType = getExcelSharePointCredentialType.call(this);
	const mapError = getErrorMapper(credentialType);
	const credentials = await this.getCredentials(credentialType);
	const options = buildRequestOptions({
		method,
		resource,
		body,
		qs,
		uri,
		headers,
		graphApiBaseUrl: credentials.graphApiBaseUrl,
	});
	try {
		return await this.helpers.httpRequestWithAuthentication.call<
			AuthContext,
			[string, IHttpRequestOptions],
			Promise<T>
		>(this, credentialType, options);
	} catch (error) {
		throw mapError.call(this, error);
	}
}
