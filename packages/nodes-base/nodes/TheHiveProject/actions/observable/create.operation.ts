import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableDataType, observableStatusSelector, tlpSelector } from '../common.description';
import { prepareOptional } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the case',
	},
	observableDataType,
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			hide: {
				dataType: ['file'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Binary Property that represent the attachment file',
		displayOptions: {
			show: {
				dataType: ['file'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		default: '',
		description: 'Description of the observable in the context of the case',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date and time of the begin of the case default=now',
	},
	tlpSelector,
	{
		displayName: 'Indicator of Compromise (IOC)',
		name: 'ioc',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the observable is an IOC (Indicator of compromise)',
	},
	{
		displayName: 'Sighted',
		name: 'sighted',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether sighted previously',
	},
	observableStatusSelector,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const caseId = this.getNodeParameter('caseId', i);

	let body: IDataObject = {
		dataType: this.getNodeParameter('dataType', i) as string,
		message: this.getNodeParameter('message', i) as string,
		startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
		tlp: this.getNodeParameter('tlp', i) as number,
		ioc: this.getNodeParameter('ioc', i) as boolean,
		sighted: this.getNodeParameter('sighted', i) as boolean,
		status: this.getNodeParameter('status', i) as string,
		...prepareOptional(this.getNodeParameter('options', i, {})),
	};

	let options: IDataObject = {};

	if (body.dataType === 'file') {
		const binaryPropertyName = this.getNodeParameter('binaryProperty', i);
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
	} else {
		body.data = this.getNodeParameter('data', i) as string;
	}

	responseData = await theHiveApiRequest.call(
		this,
		'POST',
		`/case/${caseId}/artifact`,
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
