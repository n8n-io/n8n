import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { taskStatusSelector } from '../common.description';
import {
	And,
	ContainsString,
	Eq,
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Task details',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description:
					'Date of the end of the task. This is automatically set when status is set to Completed.',
			},
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				default: false,
				description: 'Whether to flag the task. Default=false.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				default: '',
				description:
					'User who owns the task. This is automatically set to current user when status is set to InProgress.',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description:
					'Date of the beginning of the task. This is automatically set when status is set to Open.',
			},
			taskStatusSelector,
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Task details',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
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
		resource: ['task'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const credentials = await this.getCredentials('theHiveApi');
	const version = credentials.apiVersion;

	const returnAll = this.getNodeParameter('returnAll', i);
	const options = this.getNodeParameter('options', i);

	const queryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));

	const _searchQuery: IQueryObject = And();

	for (const key of Object.keys(queryAttributs)) {
		if (key === 'title' || key === 'description') {
			(_searchQuery._and as IQueryObject[]).push(
				ContainsString(key, queryAttributs[key] as string),
			);
		} else {
			(_searchQuery._and as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
		}
	}

	let endpoint;
	let method;
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
					_name: 'listTask',
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

		qs.name = 'tasks';
	} else {
		method = 'POST';
		endpoint = '/case/task/_search';

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
