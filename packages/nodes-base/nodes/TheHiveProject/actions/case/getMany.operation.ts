import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { filtersCollection, returnAllAndLimit } from '../common.description';
import { convertCustomFieldUiToObject, prepareRangeQuery } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

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
		resource: ['case'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const returnAll = this.getNodeParameter('returnAll', i);

	const filters = this.getNodeParameter('filters', i, {});

	if (filters.customFieldsUi) {
		const customFields = convertCustomFieldUiToObject(filters.customFieldsUi as IDataObject);

		for (const [key, value] of Object.entries(customFields || {})) {
			filters[`customFields.${key}`] = value;
		}

		delete filters.customFieldsUi;
	}

	const query: IDataObject[] = [
		{
			_name: 'listCase',
		},
	];

	let filter;

	if (Object.keys(filters).length) {
		filter = {
			_name: 'filter',
			_and: Object.keys(filters).map((field) => ({
				_eq: {
					_field: field,
					_value: filters[field],
				},
			})),
		};
	}

	if (filter) {
		query.push(filter);
	}

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

	let limit = undefined;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	if (limit !== undefined) {
		prepareRangeQuery(`0-${limit}`, body);
	}

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
