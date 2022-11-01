import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getAll'],
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
				operation: ['getAll'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getAll'],
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

	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index, {}) as IDataObject;

	if (Object.keys(filters).length) {
		const filterString: string[] = [];

		if (filters.custom) {
			filterString.push(filters.custom as string);
		}

		if (filterString.length) {
			qs['$filter'] = filterString.join(' and ');
		}
	}

	const endpoint = '/calendars';

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
