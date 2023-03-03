import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function chatBodyPresend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const prompts = this.getNodeParameter('prompt', '{}') as IDataObject;

	requestOptions.body = Object.assign({}, requestOptions.body, {
		messages: prompts.messages,
	});

	return requestOptions;
}
