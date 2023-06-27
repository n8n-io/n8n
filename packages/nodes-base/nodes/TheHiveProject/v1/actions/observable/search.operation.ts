import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { observableDataType, observableStatusSelector, tlpSelector } from '../common.description';
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
import type { BodyWithQuery, IQueryObject } from '../../helpers/interfaces';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				...observableDataType,
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
			observableStatusSelector,
			tlpSelector,
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

	const credentials = await this.getCredentials('theHiveApi');

	const returnAll = this.getNodeParameter('returnAll', i);

	const version = credentials.apiVersion;

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

	let endpoint;

	let method: IHttpRequestMethods;

	let body: IDataObject = {};

	const qs: IDataObject = {};

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	if (version === 'v1') {
		endpoint = '/v1/query';

		method = 'POST';

		body = {
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

		prepareSortQuery(options.sort as string, body as BodyWithQuery);

		if (limit !== undefined) {
			prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
		}

		qs.name = 'observables';
	} else {
		method = 'POST';

		endpoint = '/case/artifact/_search';

		if (limit !== undefined) {
			qs.range = `0-${limit}`;
		}

		body.query = _searchQuery;

		Object.assign(qs, prepareOptional(options));
	}

	responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
