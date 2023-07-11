import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableTypeOptions, observableStatusOptions, tlpOptions } from '../../descriptions';
import {
	And,
	Between,
	ContainsString,
	Eq,
	In,
	prepareOptional,
	prepareRangeQuery,
	prepareSortQuery,
} from '../../helpers/utils';

import { theHiveApiRequest } from '../../transport';
import type { IQueryObject } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				...observableTypeOptions,
				type: 'multiOptions',
			},
			{
				displayName: 'Date Range',
				type: 'fixedCollection',
				name: 'range',
				default: {},
				options: [
					{
						displayName: 'Add Date Range Inputs',
						name: 'dateRange',
						values: [
							{
								displayName: 'From Date',
								name: 'fromDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'To Date',
								name: 'toDate',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				type: 'boolean',
				default: false,
				description: 'Whether the observable is an IOC (Indicator of compromise)',
			},
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Description of the observable in the context of the case',
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				type: 'boolean',
				default: false,
			},
			observableStatusOptions,
			tlpOptions,
			{
				displayName: 'Value',
				name: 'data',
				type: 'string',
				default: '',
				placeholder: 'example.com; 8.8.8.8',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				description: 'Specify the sorting attribut, + for asc, - for desc',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const returnAll = this.getNodeParameter('returnAll', i);

	const queryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));

	const _searchQuery: IQueryObject = And();

	const options = this.getNodeParameter('options', i);

	for (const key of Object.keys(queryAttributs)) {
		if (key === 'dataType' || key === 'tags') {
			(_searchQuery._and as IQueryObject[]).push(In(key, queryAttributs[key] as string[]));
		} else if (key === 'description' || key === 'keywork' || key === 'message') {
			(_searchQuery._and as IQueryObject[]).push(
				ContainsString(key, queryAttributs[key] as string),
			);
		} else if (key === 'range') {
			(_searchQuery._and as IQueryObject[]).push(
				Between(
					'startDate',
					((queryAttributs.range as IDataObject).dateRange as IDataObject).fromDate,
					((queryAttributs.range as IDataObject).dateRange as IDataObject).toDate,
				),
			);
		} else {
			(_searchQuery._and as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
		}
	}

	const qs: IDataObject = {};

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	const body = {
		query: [
			{
				_name: 'listObservable',
			},
			{
				_name: 'filter',
				_and: _searchQuery._and,
			},
		],
	};

	prepareSortQuery(options.sort as string, body);

	if (limit !== undefined) {
		prepareRangeQuery(`0-${limit}`, body);
	}

	qs.name = 'observables';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
