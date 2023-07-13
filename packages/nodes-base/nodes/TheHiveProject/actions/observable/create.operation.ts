import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { theHiveApiRequest } from '../../transport';

import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { alertRLC, caseRLC } from '../../descriptions';

import FormData from 'form-data';

const properties: INodeProperties[] = [
	{
		displayName: 'Create in ...',
		name: 'createIn',
		type: 'options',
		options: [
			{
				name: 'Case',
				value: 'case',
			},
			{
				name: 'Alert',
				value: 'alert',
			},
		],
		default: 'case',
	},
	{
		...caseRLC,
		name: 'id',
		displayOptions: {
			show: {
				createIn: ['case'],
			},
		},
	},
	{
		...alertRLC,
		name: 'id',
		displayOptions: {
			show: {
				createIn: ['alert'],
			},
		},
	},
	{
		displayName:
			'If Data Type is attachment use "Attachment" field to specify input names with binary data, otherwise use "Data" field ("Attachment" would be ignored)',
		name: 'noticeDataType',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getObservableFields',
				mode: 'add',
				valuesLabel: 'Fields',
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];
	let body: IDataObject = {};

	const createIn = this.getNodeParameter('createIn', i) as string;
	const id = this.getNodeParameter('id', i, '', { extractValue: true }) as string;
	const endpoint = `/v1/${createIn}/${id}/observable`;

	const dataMode = this.getNodeParameter('fields.mappingMode', i) as string;

	if (dataMode === 'autoMapInputData') {
		const schema = this.getNodeParameter('fields.schema', i) as IDataObject[];
		body = prepareInputItem(item.json, schema, i);
	}

	if (dataMode === 'defineBelow') {
		const fields = this.getNodeParameter('fields.value', i, []) as IDataObject;
		body = fields;
	}

	const { attachment } = body;

	body = fixFieldType(body);

	if (attachment) {
		const inputDataFields = (attachment as string)
			.split(',')
			.filter((field) => field)
			.map((field) => field.trim());

		const formData = new FormData();

		for (const inputDataField of inputDataFields) {
			const binaryData = this.helpers.assertBinaryData(i, inputDataField);
			const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);

			formData.append('attachment', dataBuffer, {
				filename: binaryData.fileName,
				contentType: binaryData.mimeType,
			});
		}

		formData.append('_json', JSON.stringify(body));

		responseData = await theHiveApiRequest.call(
			this,
			'POST',
			endpoint,
			undefined,
			undefined,
			undefined,
			{
				Headers: {
					'Content-Type': 'multipart/form-data',
				},
				formData,
			},
		);
	} else {
		responseData = await theHiveApiRequest.call(this, 'POST', endpoint, body);
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
