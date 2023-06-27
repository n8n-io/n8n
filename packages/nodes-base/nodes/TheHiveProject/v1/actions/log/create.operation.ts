import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { observableStatusSelector } from '../common.description';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the task',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		default: '',
		description: 'Content of the Log',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date of the log submission default=now',
	},
	{
		...observableStatusSelector,
		required: true,
		description: 'Status of the log (Ok or Deleted) default=Ok',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Attachment',
				name: 'attachmentValues',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Attachment',
						name: 'attachmentValues',
						values: [
							{
								displayName: 'Binary Property',
								name: 'binaryProperty',
								type: 'string',
								default: 'data',
								description: 'Object property name which holds binary data',
							},
						],
					},
				],
				description: 'File attached to the log',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const taskId = this.getNodeParameter('taskId', i) as string;

	let body: IDataObject = {
		message: this.getNodeParameter('message', i),
		startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
		status: this.getNodeParameter('status', i),
	};
	const optionals = this.getNodeParameter('options', i);

	let options: IDataObject = {};

	if (optionals.attachementUi) {
		const attachmentValues = (optionals.attachementUi as IDataObject)
			.attachmentValues as IDataObject;

		if (attachmentValues) {
			const binaryPropertyName = attachmentValues.binaryProperty as string;
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			options = {
				formData: {
					attachment: {
						value: dataBuffer,
						options: {
							contentType: binaryData.mimeType,
							filename: binaryData.fileName,
						},
					},
					_json: JSON.stringify(body),
				},
			};

			body = {};
		}
	}

	responseData = await theHiveApiRequest.call(
		this,
		'POST',
		`/case/task/${taskId}/log`,
		body,
		undefined,
		undefined,
		options,
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
