import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { JSONSafeParse } from '../../helpers';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['upload'],
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
			displayName: 'Upload Mode',
			name: 'uploadMode',
			type: 'options',
			required: true,
			options: [
				{
					name: 'Base64',
					value: 'base64',
				},
				{
					name: 'Url',
					value: 'url',
				},
			],
			default: 'base64',
			description: 'Choose a way to perform the upload',
		},
		{
			displayName: 'Upload Field Name or ID',
			name: 'uploadFieldName',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			typeOptions: {
				loadOptionsDependsOn: ['table.value', 'uploadMode'],
			},
			displayOptions: {
				show: {
					uploadMode: ['base64'],
				},
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getDownloadFieldsId',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'c4gzwl1scxmj2i5',
				},
			],
			required: true,
			description:
				'Name of the fields of type \'attachment\' that will be uploaded. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Upload Field Name or ID',
			name: 'uploadFieldName',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			typeOptions: {
				loadOptionsDependsOn: ['table.value', 'uploadMode'],
			},
			displayOptions: {
				show: {
					uploadMode: ['url'],
				},
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getDownloadFields',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'c4gzwl1scxmj2i5',
				},
			],
			required: true,
			description:
				'Name of the fields of type \'attachment\' that will be uploaded. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Filename',
			name: 'filename',
			type: 'string',
			required: true,
			placeholder: 'file.jpg',
			default: '',
			displayOptions: {
				show: {
					uploadMode: ['base64'],
				},
			},
			description: 'Name of uploaded file',
		},
		{
			displayName: 'Content Type',
			name: 'contentType',
			type: 'string',
			placeholder: 'image/jpeg',
			required: true,
			default: '',
			displayOptions: {
				show: {
					uploadMode: ['base64'],
				},
			},
			description: 'Content type of file',
		},
		{
			displayName: 'Base64 Value',
			name: 'base64value',
			type: 'string',
			required: true,
			default: '',
			displayOptions: {
				show: {
					uploadMode: ['base64'],
				},
			},
			description: 'Base64 value of file that will be upload',
		},
		{
			displayName: 'File Url',
			name: 'url',
			type: 'string',
			validateType: 'url',
			required: true,
			default: '',
			displayOptions: {
				show: {
					uploadMode: ['url'],
				},
			},
			description: 'URL of file that will be uploaded',
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
	let body: IDataObject | IDataObject[] = {};

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'PATCH';

			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;
			const id = this.getNodeParameter('id', i, undefined, {
				extractValue: true,
			}) as string;
			const uploadFieldName = this.getNodeParameter('uploadFieldName', i, undefined, {
				extractValue: true,
			}) as string;
			const uploadMode = this.getNodeParameter('uploadMode', i) as string;

			if (uploadMode === 'base64') {
				endPoint = `/api/v3/data/${baseId}/${table}/records/${id}/fields/${uploadFieldName}/upload`;
				const contentType = this.getNodeParameter('contentType', i, undefined, {
					extractValue: true,
				}) as string;
				const filename = this.getNodeParameter('filename', i, undefined, {
					extractValue: true,
				}) as string;
				const base64Data = this.getNodeParameter('base64value', i, undefined, {
					extractValue: true,
				}) as string;
				body = {
					contentType,
					file: base64Data,
					filename,
				};
				responseData = await apiRequest.call(this, 'POST', endPoint, body, qs);
				returnData.push.apply(returnData, [responseData] as IDataObject[]);
			} else {
				endPoint = `/api/v3/data/${baseId}/${table}/records/${id}`;
				// uploadMode = url
				const url = this.getNodeParameter('url', i) as string;
				const existingData: IDataObject = await apiRequest.call(this, 'GET', endPoint, body, qs);
				let field: string | IDataObject[] | undefined = (existingData.fields as IDataObject)[
					uploadFieldName
				] as string | IDataObject[];

				if (field && typeof field === 'string') {
					field = JSONSafeParse<IDataObject[]>(field);
					if (field && !Array.isArray(field)) {
						throw new Error('Attachment value need to be an array');
					}
				}

				field = field ?? [];
				(field as IDataObject[]).push({
					url,
				});

				body = [
					{
						id,
						fields: {
							[uploadFieldName]: field,
						},
					},
				];

				endPoint = `/api/v3/data/${baseId}/${table}/records`;
				responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
				returnData.push.apply(returnData, responseData.records as IDataObject[]);
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
