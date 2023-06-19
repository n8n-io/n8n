import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { observableDataType, tlpSelector } from '../common.description';

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
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		default: 'Ok',
		options: [
			{
				name: 'Ok',
				value: 'Ok',
			},
			{
				name: 'Deleted',
				value: 'Deleted',
			},
		],
		description: 'Status of the observable. Default=Ok.',
	},
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
	const responseData: IDataObject[] = [];

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
