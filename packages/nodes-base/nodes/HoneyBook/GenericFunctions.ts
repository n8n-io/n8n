import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

export async function honeyBookApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		let options: OptionsWithUri = {
			headers: {},
			method,
			qs,
			body,
			uri: uri || `http://localhost:3000/api/v2${resource}`,
			json: true,
		};
		options = Object.assign({}, options, option);
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(this, 'honeyBookApi', options);
	} catch (error) {
		console.log('=== HB API REQUEST ERROR ===', error);
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
