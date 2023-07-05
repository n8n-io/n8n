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
} from '../../helpers/utils';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';
import type { IQueryObject } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	...returnAllAndLimit,
	filtersCollection,
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'asc',
							},
							{
								name: 'Descending',
								value: 'desc',
							},
						],
						default: 'asc',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
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

	if ('customFieldsUi' in filters) {
		const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
		const searchQueries = buildCustomFieldSearch(customFields);
		(_searchQuery._and as IQueryObject[]).push(...searchQueries);
	}

	for (const key of Object.keys(queryAttributs)) {
		if (key === 'tags') {
			(_searchQuery._and as IQueryObject[]).push(In(key, queryAttributs[key] as string[]));
		} else if (key === 'description' || key === 'title') {
			(_searchQuery._and as IQueryObject[]).push(
				ContainsString(key, queryAttributs[key] as string),
			);
		} else {
			(_searchQuery._and as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
		}
	}

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	const qs: IDataObject = {};

	const query: IDataObject[] = [
		{
			_name: 'listAlert',
		},
		{
			_name: 'filter',
			_and: _searchQuery._and,
		},
	];

	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];

	if (sortFields.length) {
		query.push({
			_name: 'sort',
			_fields: sortFields.map((field) => {
				return {
					[`${field.field as string}`]: field.direction as string,
				};
			}),
		});
	}

	const body: IDataObject = {
		query,
	};

	if (limit !== undefined) {
		prepareRangeQuery(`0-${limit}`, body);
	}

	qs.name = 'alerts';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
