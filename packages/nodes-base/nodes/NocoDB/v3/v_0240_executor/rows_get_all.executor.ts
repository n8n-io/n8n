import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../GenericFunctions';

export async function execute_V_0240_rows_get_all(
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

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'GET';
			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			qs = this.getNodeParameter('options', i, {});

			endPoint = `/api/v3/data/${baseId}/${table}/records`;

			if (qs.sort) {
				const properties = (qs.sort as IDataObject).property as Array<{
					field: string;
					direction: string;
				}>;
				qs.sort = properties
					.map((prop) => `${prop.direction === 'asc' ? '' : '-'}${prop.field}`)
					.join(',');
			}
			if (qs.fields) {
				qs.fields = (qs.fields as IDataObject[]).join(',');
			}

			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, requestMethod, endPoint, {}, qs);
			} else {
				qs.limit = this.getNodeParameter('limit', 0);
				responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
				responseData = responseData.records;
			}

			const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

			if (downloadAttachments) {
				const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(
					',',
				);
				const response = await downloadRecordAttachments.call(
					this,
					responseData as IDataObject[],
					downloadFieldNames,
					[{ item: i }],
				);
				returnData.push(...response);
			} else {
				returnData.push(...(responseData as IDataObject[]));
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
