import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { alertRLC, caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		displayName: 'Add to',
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
		...caseRLC,
		name: 'id',
		displayOptions: {
			show: {
				addTo: ['case'],
			},
		},
	},
	{
		...alertRLC,
		name: 'id',
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
	const id = this.getNodeParameter('id', i, '', { extractValue: true });
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
