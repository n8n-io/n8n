import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Calendar',
		name: 'calendarId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCalendars',
		},
		default: [],
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['createEvent'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['createEvent'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['createEvent'],
			},
		},
		options: [],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;

	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const calendarId = this.getNodeParameter('calendarId', index) as string;
	const subject = this.getNodeParameter('subject', index) as string;

	let endpoint = `/calendars/${calendarId}/events`;

	if (additionalFields.calendarGroup) {
		endpoint = `/calendarGroups/${additionalFields.calendarGroup}/calendars`;
		delete additionalFields.calendarGroup;
	}

	const body: IDataObject = {
		subject,
		...additionalFields,
	};

	responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
