import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { eventfields } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';
import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC, returnAllOrLimit } from '../../descriptions';

export const properties: INodeProperties[] = [
	calendarRLC,
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
				placeholder: 'e.g. canShare eq true',
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

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs = {} as IDataObject;

	const calendarId = this.getNodeParameter('calendarId', index, undefined, {
		extractValue: true,
	}) as string;

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

	const endpoint = `/calendars/${calendarId}/events`;

	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			endpoint,
			undefined,
			qs,
		);
	} else {
		qs.$top = this.getNodeParameter('limit', index);
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
