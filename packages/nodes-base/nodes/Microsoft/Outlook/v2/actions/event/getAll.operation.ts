import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC, returnAllOrLimit } from '../../descriptions';
import { eventfields } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'From All Calendars',
		name: 'fromAllCalendars',
		type: 'boolean',
		default: true,
	},
	{
		...calendarRLC,
		displayOptions: {
			show: {
				fromAllCalendars: [false],
			},
		},
	},
	...returnAllOrLimit,
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
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
		description: 'The fields to add to the output',
		displayOptions: {
			show: {
				output: ['fields'],
			},
		},
		options: eventfields,
		default: [],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Filter Query',
				name: 'custom',
				type: 'string',
				default: '',
				placeholder: "e.g. contains(subject,'Hello')",
				hint: 'Search query to filter events. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['event'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const responseData: IDataObject[] = [];
	const qs = {} as IDataObject;

	const returnAll = this.getNodeParameter('returnAll', index);
	const filters = this.getNodeParameter('filters', index, {});
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs.$select = fields.join(',');
	}

	if (output === 'simple') {
		qs.$select = 'id,subject,bodyPreview,start,end,organizer,attendees,webLink';
	}

	if (Object.keys(filters).length) {
		const filterString: string[] = [];

		if (filters.custom) {
			filterString.push(filters.custom as string);
		}

		if (filterString.length) {
			qs.$filter = filterString.join(' and ');
		}
	}

	const calendars: string[] = [];

	const fromAllCalendars = this.getNodeParameter('fromAllCalendars', index) as boolean;

	if (fromAllCalendars) {
		const response = await microsoftApiRequest.call(this, 'GET', '/calendars', undefined, {
			$select: 'id',
		});
		for (const calendar of response.value) {
			calendars.push(calendar.id as string);
		}
	} else {
		const calendarId = this.getNodeParameter('calendarId', index, undefined, {
			extractValue: true,
		}) as string;

		calendars.push(calendarId);
	}
	const limit = this.getNodeParameter('limit', index, 0);

	for (const calendarId of calendars) {
		const endpoint = `/calendars/${calendarId}/events`;

		if (returnAll) {
			const response = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				endpoint,
				undefined,
				qs,
			);
			responseData.push(...response);
		} else {
			qs.$top = limit - responseData.length;

			if (qs.$top <= 0) break;

			const response = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
			responseData.push(...response.value);
		}
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
