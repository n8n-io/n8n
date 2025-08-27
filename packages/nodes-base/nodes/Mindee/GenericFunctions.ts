import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: any = {},
	qs: IDataObject = {},
	option = {},
): Promise<any> {
	const url = `https://api-v2.mindee.net/v2${path}`;

	const options: IHttpRequestOptions = {
		headers: {},
		method,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		body,
		qs,
		url,
		disableFollowRedirect: true,
		ignoreHttpStatusErrors: true,
		json: false,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}

		return await this.helpers.httpRequestWithAuthentication.call(this, 'mindeeV2Api', {
			...options,
			maxRedirects: 0,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
