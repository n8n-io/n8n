import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest } from '../../GenericFunctions';

export async function execute_V_0240_rows_update(
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
	let body: IDataObject | IDataObject[] = {};

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'PATCH';
			endPoint = `/api/v3/data/${baseId}/${table}/records`;

			const id = this.getNodeParameter('id', i, undefined, {
				extractValue: true,
			}) as string;
			const newItem: {
				id: string;
				fields: IDataObject;
			} = { id, fields: {} };
			const dataToSend = this.getNodeParameter('dataToSend', i) as
				| 'defineBelow'
				| 'mapWithFields'
				| 'autoMapInputData';

			if (dataToSend === 'autoMapInputData') {
				if (!items[i].json.fields) {
					const incomingKeys = Object.keys(items[i].json.fields as any);
					const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
					const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
					for (const key of incomingKeys) {
						if (inputDataToIgnore.includes(key)) continue;
						newItem.fields[key] = items[i].json[key];
					}
				}
			} else {
				const fields = this.getNodeParameter('fieldsMapper', i, []) as any;
				newItem.fields = fields?.value;
			}
			body = [newItem]; // NocoDB v2/v3 create expects an array of objects

			responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
			returnData.push(...(responseData.records as IDataObject[]));
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
