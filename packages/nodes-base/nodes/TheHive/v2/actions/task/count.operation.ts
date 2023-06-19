import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { taskStatusSelector } from '../common.description';
import { And, ContainsString, Eq, prepareOptional } from '../../helpers/utils';
import type { IQueryObject } from '../../helpers/interfaces';
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
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['task'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const countQueryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));

	const _countSearchQuery: IQueryObject = And();

	for (const key of Object.keys(countQueryAttributs)) {
		if (key === 'title' || key === 'description') {
			(_countSearchQuery._and as IQueryObject[]).push(
				ContainsString(key, countQueryAttributs[key] as string),
			);
		} else {
			(_countSearchQuery._and as IQueryObject[]).push(Eq(key, countQueryAttributs[key] as string));
		}
	}

	const body = {
		query: [
			{
				_name: 'listTask',
			},
			{
				_name: 'filter',
				_and: _countSearchQuery._and,
			},
		],
	};

	body.query.push({
		_name: 'count',
	});

	const qs: IDataObject = {};

	qs.name = 'count-tasks';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	responseData = { count: responseData };

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
