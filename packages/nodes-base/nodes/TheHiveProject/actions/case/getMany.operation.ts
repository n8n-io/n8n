import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

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
import type { IQueryObject } from '../../helpers/interfaces';
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

	const returnAll = this.getNodeParameter('returnAll', i);

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

	const qs: IDataObject = {};

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	const body: IDataObject = {
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

	prepareSortQuery(options.sort as string, body);

	if (limit !== undefined) {
		prepareRangeQuery(`0-${limit}`, body);
	}

	qs.name = 'cases';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
