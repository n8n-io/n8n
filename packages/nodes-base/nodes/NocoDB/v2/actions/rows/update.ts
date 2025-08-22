import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { DataToSendOption, RowCreateUpdateOptions } from './create_update.options';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['update'],
		},
	},
	[
		...DataToSendOption,
		{
			displayName: 'This operation requires the primary key to be included for each row.',
			name: 'info',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					dataToSend: ['autoMapInputData', 'defineBelow'],
					version: [3],
				},
			},
		},
		{
			displayName: 'Row ID Value',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			description: 'The value of the ID field',
			displayOptions: {
				show: {
					version: [4],
				},
			},
		},

		...RowCreateUpdateOptions,

		{
			displayName: 'Fields to Send',
			name: 'fieldsMapper',
			type: 'resourceMapper',
			default: {
				mappingMode: 'defineBelow',
				value: null,
			},
			displayOptions: {
				show: {
					dataToSend: ['mapWithFields'],
				},
			},

			required: true,
			noDataExpression: true,
			typeOptions: {
				loadOptionsDependsOn: ['table.value'],
				resourceMapper: {
					resourceMapperMethod: 'getResouceMapperFields',
					mode: 'add',
					fieldWords: {
						singular: 'column',
						plural: 'columns',
					},
					addAllFields: true,
					supportAutoMap: false,
				},
			},
		},
	],
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];
	let responseData;

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	const qs: IDataObject = {};

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
			returnData.push.apply(returnData, responseData.records as IDataObject[]);
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
