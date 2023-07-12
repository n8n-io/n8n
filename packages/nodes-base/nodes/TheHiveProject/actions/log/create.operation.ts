import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { theHiveApiRequest } from '../../transport';

import { fixFieldType } from '../../helpers/utils';
import { taskRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	taskRLC,
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
				resourceMapperMethod: 'getLogFields',
				mode: 'add',
				valuesLabel: 'Fields',
			},
		},
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'string',
		placeholder: '“e.g. data, data2',
		default: '',
		description:
			'The names of the fields in a input item which contain the binary data to be send as attachments',
	},
];

const displayOptions = {
	show: {
		resource: ['log'],
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

	const dataMode = this.getNodeParameter('fields.mappingMode', i) as string;
	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;
	const attachments = this.getNodeParameter('attachments', i, '') as string;

	if (dataMode === 'autoMapInputData') {
		body = item.json;
	}

	if (dataMode === 'defineBelow') {
		const fields = this.getNodeParameter('fields.value', i, []) as IDataObject;
		body = fields;
	}

	body = fixFieldType(body);

	if (attachments) {
		const inputDataFields = attachments
			.split(',')
			.filter((field) => field)
			.map((field) => field.trim());

		const binaries = [];

		for (const inputDataField of inputDataFields) {
			const binaryData = this.helpers.assertBinaryData(i, inputDataField);
			const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);

			binaries.push({
				value: dataBuffer,
				options: {
					contentType: binaryData.mimeType,
					filename: binaryData.fileName,
				},
			});
		}

		responseData = await theHiveApiRequest.call(
			this,
			'POST',
			`/v1/task/${taskId}/log`,
			undefined,
			undefined,
			undefined,
			{
				Headers: {
					'Content-Type': 'multipart/form-data',
				},
				formData: {
					attachments: binaries,
					_json: JSON.stringify(body),
				},
			},
		);
	} else {
		responseData = await theHiveApiRequest.call(this, 'POST', `/v1/task/${taskId}/log`, body);
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
