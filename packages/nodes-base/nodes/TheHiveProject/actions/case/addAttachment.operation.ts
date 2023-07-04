import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
import { caseRLC } from '../common.description';

const properties: INodeProperties[] = [
	caseRLC,
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Can Rename',
				name: 'canRename',
				type: 'boolean',
				description:
					'Whether set to true, the files can be renamed if they already exist with the same name',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['addAttachment'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
	const canRename = this.getNodeParameter('options.canRename', i, false) as boolean;
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

	responseData = await theHiveApiRequest.call(
		this,
		'POST',
		`/v1/case/${caseId}/attachments`,
		undefined,
		undefined,
		undefined,
		{
			Headers: {
				'Content-Type': 'multipart/form-data',
			},
			formData: {
				attachments,
				canRename: JSON.stringify(canRename),
			},
		},
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
