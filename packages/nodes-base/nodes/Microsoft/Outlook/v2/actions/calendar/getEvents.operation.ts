import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { eventfields } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Calendar',
		name: 'calendarId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCalendars',
		},
		default: [],
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getEvents'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getEvents'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getEvents'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getEvents'],
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
				resource: ['calendar'],
				operation: ['getEvents'],
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
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getEvents'],
				// returnAll: [true],
			},
		},
		options: [
			{
				displayName: 'Custom Filter',
				name: 'custom',
				type: 'string',
				default: '',
				placeholder: 'canShare eq true',
				hint: 'Information about the syntax can be found <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">here</a>',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs = {} as IDataObject;

	const calendarId = this.getNodeParameter('calendarId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs['$select'] = fields.join(',');
	}

	if (output === 'simple') {
		qs['$select'] = 'id,subject,bodyPreview,start,end,organizer,attendees,webLink';
	}

	if (Object.keys(filters).length) {
		const filterString: string[] = [];

		if (filters.custom) {
			filterString.push(filters.custom as string);
		}

		if (filterString.length) {
			qs['$filter'] = filterString.join(' and ');
		}
	}

	const endpoint = `/calendars/${calendarId}/events`;

	if (returnAll === true) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			endpoint,
			undefined,
			qs,
		);
	} else {
		qs['$top'] = this.getNodeParameter('limit', index) as number;
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
