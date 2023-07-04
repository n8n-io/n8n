import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { filtersCollection } from '../common.description';
import {
	And,
	ContainsString,
	Eq,
	In,
	buildCustomFieldSearch,
	prepareOptional,
} from '../../helpers/utils';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';
import type { IQueryObject } from '../../helpers/interfaces';

const properties: INodeProperties[] = [filtersCollection];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['count'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const filters = this.getNodeParameter('filters', i, {});
	const countQueryAttributs = prepareOptional(filters);

	const _countSearchQuery: IQueryObject = And();

	if ('customFieldsUi' in filters) {
		const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
		const searchQueries = buildCustomFieldSearch(customFields);
		(_countSearchQuery._and as IQueryObject[]).push(...searchQueries);
	}

	for (const key of Object.keys(countQueryAttributs)) {
		if (key === 'tags') {
			(_countSearchQuery._and as IQueryObject[]).push(
				In(key, countQueryAttributs[key] as string[]),
			);
		} else if (key === 'description' || key === 'summary' || key === 'title') {
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
				_name: 'listCase',
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

	qs.name = 'count-cases';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	responseData = { count: responseData };

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
