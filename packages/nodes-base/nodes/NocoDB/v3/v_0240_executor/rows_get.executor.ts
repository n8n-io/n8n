import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest, downloadRecordAttachments } from '../../GenericFunctions';

export async function execute_V_0240_rows_get(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];
	let responseData;

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	let qs: IDataObject = {};

	const baseId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	}) as string;
	const table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'GET';
			const id = this.getNodeParameter('id', i) as string;
			endPoint = `/api/v3/data/${baseId}/${table}/records/${id}`;

			responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);

			const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

			if (downloadAttachments) {
				const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', i) as string).split(
					',',
				);
				const data = await downloadRecordAttachments.call(
					this,
					[responseData.map((row: any) => ({ ...row, ...row.fields })) as IDataObject],
					downloadFieldNames,
					[{ item: i }],
				);
				const newItem = {
					binary: data[0].binary,
					json: {},
				};
				returnData.push(newItem);
			} else {
				returnData.push(responseData as IDataObject);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.toString() });
			} else {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}
	}

	return [this.helpers.returnJsonArray(returnData)];
}
