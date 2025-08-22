import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest, downloadRecordAttachments } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['get'],
		},
	},
	[
		{
			displayName: 'Row ID Value',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			description: 'The value of the ID field',
		},
		{
			displayName: 'Download Attachments',
			name: 'downloadAttachments',
			type: 'boolean',
			default: false,
			description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
		},
		{
			displayName: 'Download Field Name or ID',
			name: 'downloadFieldNames',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getDownloadFields',
			},
			required: true,
			displayOptions: {
				show: {
					downloadAttachments: [true],
				},
			},
			default: '',
			description:
				'Name of the fields of type \'attachment\' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
