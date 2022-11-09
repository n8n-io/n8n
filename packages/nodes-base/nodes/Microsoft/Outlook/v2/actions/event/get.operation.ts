import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { eventfields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Select Included Fields',
				value: 'fields',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
				output: ['fields'],
			},
		},
		options: eventfields,
		default: [],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs = {} as IDataObject;

	const eventId = this.getNodeParameter('eventId', index) as string;
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs['$select'] = fields.join(',');
	}

	if (output === 'simple') {
		qs['$select'] = 'id,subject,bodyPreview,start,end,organizer,attendees,webLink';
	}

	const endpoint = `/calendar/events/${eventId}`;

	responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
