import type { OptionsWithUri } from 'request';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export async function segmentApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.segment.io/v1${resource}`,
		json: true,
	};
	if (!Object.keys(body as IDataObject).length) {
		delete options.body;
	}
	return await this.helpers.requestWithAuthentication.call(this, 'segmentApi', options);
}
