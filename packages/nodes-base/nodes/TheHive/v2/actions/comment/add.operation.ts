import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Add to ...',
		name: 'addTo',
		type: 'options',
		options: [
			{
				name: 'Alert',
				value: 'alert',
			},
			{
				name: 'Case',
				value: 'case',
			},
		],
		default: 'alert',
	},
	{
		displayName: 'Case ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				addTo: ['case'],
			},
		},
	},
	{
		displayName: 'Alert ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				addTo: ['alert'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		typeOptions: {
			rows: 2,
		},
	},
];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['add'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const addTo = this.getNodeParameter('addTo', i) as string;
	const id = this.getNodeParameter('id', i) as string;
	const message = this.getNodeParameter('message', i) as string;

	const body: IDataObject = {
		message,
	};

	responseData = await theHiveApiRequest.call(this, 'POST', `/v1/${addTo}/${id}/comment`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
