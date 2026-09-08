import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	calendarRLC,
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				default: 'lightBlue',
				options: [
					{
						name: 'Light blue',
						value: 'lightBlue',
					},
					{
						name: 'Light brown',
						value: 'lightBrown',
					},
					{
						name: 'Light gray',
						value: 'lightGray',
					},
					{
						name: 'Light green',
						value: 'lightGreen',
					},
					{
						name: 'Light orange',
						value: 'lightOrange',
					},
					{
						name: 'Light pink',
						value: 'lightPink',
					},
					{
						name: 'Light red',
						value: 'lightRed',
					},
					{
						name: 'Light teal',
						value: 'lightTeal',
					},
					{
						name: 'Light yellow',
						value: 'lightYellow',
					},
				],
				description: 'Specify the color to distinguish the calendar from the others',
			},
			{
				displayName: 'Default calendar',
				name: 'isDefaultCalendar',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. My Calendar',
				description: 'The name of the calendar',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['calendar'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const updateFields = this.getNodeParameter('updateFields', index);

	const calendarId = this.getNodeParameter('calendarId', index, undefined, {
		extractValue: true,
	}) as string;

	const endpoint = `/calendars/${calendarId}`;

	const body: IDataObject = {
		...updateFields,
	};

	const responseData = await microsoftApiRequest.call(this, 'PATCH', endpoint, index, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
