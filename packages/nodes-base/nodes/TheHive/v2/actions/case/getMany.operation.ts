import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';

import { filtersCollection, returnAllAndLimit } from '../common.description';
import {
	And,
	ContainsString,
	Eq,
	In,
	buildCustomFieldSearch,
	prepareOptional,
	prepareRangeQuery,
	prepareSortQuery,
} from '../../helpers/utils';
import type { BodyWithQuery, IQueryObject } from '../../helpers/interfaces';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	...returnAllAndLimit,
	filtersCollection,
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
		resource: ['case'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const credentials = await this.getCredentials('theHiveApi');

	const returnAll = this.getNodeParameter('returnAll', i);

	const version = credentials.apiVersion;

	const filters = this.getNodeParameter('filters', i, {});
	const queryAttributs = prepareOptional(filters);

	const _searchQuery: IQueryObject = And();

	const options = this.getNodeParameter('options', i);

	if ('customFieldsUi' in filters) {
		const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
		const searchQueries = buildCustomFieldSearch(customFields);
		(_searchQuery._and as IQueryObject[]).push(...searchQueries);
	}

	for (const key of Object.keys(queryAttributs)) {
		if (key === 'tags') {
			(_searchQuery._and as IQueryObject[]).push(In(key, queryAttributs[key] as string[]));
		} else if (key === 'description' || key === 'summary' || key === 'title') {
			(_searchQuery._and as IQueryObject[]).push(
				ContainsString(key, queryAttributs[key] as string),
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
					_name: 'listCase',
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

		qs.name = 'cases';
	} else {
		method = 'POST';

		endpoint = '/case/_search';

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
