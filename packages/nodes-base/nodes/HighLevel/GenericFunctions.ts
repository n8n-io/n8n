import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';

export async function transformGetContactReponse(this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse): Promise<INodeExecutionData[]> {
	const flatten = this.getNodeParameter('flatten', 0) as boolean;
	if (flatten) {
		items.forEach(item => item.json = item.json.contact as IDataObject || item.json);
	}
	return items;
}
