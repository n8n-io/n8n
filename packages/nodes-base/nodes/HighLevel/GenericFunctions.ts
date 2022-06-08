import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Converts the bin response data and adds additional properties
 *
 * @param {IExecuteSingleFunctions} this
 * @param {INodeExecutionData} items[]
 * @param {IN8nHttpFullResponse} response
 * @returns {Promise<INodeExecutionData[]>}
 */
export async function transformBinReponse(this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse): Promise<INodeExecutionData[]> {
	const flatten = this.getNodeParameter('flatten', 0) as boolean;
	if (flatten) {
		items.forEach(item => item.json = item.json.contact as IDataObject || item.json);
	}
	return items;
}
