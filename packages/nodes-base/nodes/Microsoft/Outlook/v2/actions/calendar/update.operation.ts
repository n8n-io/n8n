import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				default: 'lightBlue',
				options: [
					{
						name: 'Light Blue',
						value: 'lightBlue',
					},
					{
						name: 'Light Brown',
						value: 'lightBrown',
					},
					{
						name: 'Light Gray',
						value: 'lightGray',
					},
					{
						name: 'Light Green',
						value: 'lightGreen',
					},
					{
						name: 'Light Orange',
						value: 'lightOrange',
					},
					{
						name: 'Light Pink',
						value: 'lightPink',
					},
					{
						name: 'Light Red',
						value: 'lightRed',
					},
					{
						name: 'Light Teal',
						value: 'lightTeal',
					},
					{
						name: 'Light Yellow',
						value: 'lightYellow',
					},
				],
				description:
					'Specify the color theme to distinguish the calendar from other calendars in a UI',
			},
			{
				displayName: 'Default Calendar',
				name: 'isDefaultCalendar',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const updateFields = this.getNodeParameter('updateFields', index);
	const calendarId = this.getNodeParameter('calendarId', index) as string;

	const endpoint = `/calendars/${calendarId}`;

	const body: IDataObject = {
		...updateFields,
	};

	const responseData = await microsoftApiRequest.call(this, 'PATCH', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
