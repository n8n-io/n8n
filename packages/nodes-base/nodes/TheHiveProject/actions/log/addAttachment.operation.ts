import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
import { logRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	logRLC,
	{
		displayName: 'Input Data Field Names',
		name: 'inputDataFiels',
		type: 'string',
		placeholder: '“e.g. data, data2',
		default: 'data',
		required: true,
		description:
			'The names of the fields in a input item which contain the binary data to be send as attachments',
	},
];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['addAttachment'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const logId = this.getNodeParameter('logId', i, '', { extractValue: true }) as string;
	const inputDataFields = (this.getNodeParameter('inputDataFiels', i, '') as string)
		.split(',')
		.filter((item) => item)
		.map((item) => item.trim());

	const attachments = [];

	for (const inputDataField of inputDataFields) {
		const binaryData = this.helpers.assertBinaryData(i, inputDataField);
		const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);

		attachments.push({
			value: dataBuffer,
			options: {
				contentType: binaryData.mimeType,
				filename: binaryData.fileName,
			},
		});
	}

	await theHiveApiRequest.call(
		this,
		'POST',
		`/v1/log/${logId}/attachments`,
		undefined,
		undefined,
		undefined,
		{
			Headers: {
				'Content-Type': 'multipart/form-data',
			},
			formData: {
				attachments,
			},
		},
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
