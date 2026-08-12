import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import {
	caseRLC,
	genericFiltersCollection,
	returnAllAndLimit,
	searchOptions,
	sortCollection,
} from '../../descriptions';
import type { QueryScope } from '../../helpers/interfaces';
import { theHiveApiQuery } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Search in All Cases',
		name: 'allCases',
		type: 'boolean',
		default: true,
		description: 'Whether to search in all cases or only in a selected case',
	},
	{
		...caseRLC,
		displayOptions: {
			show: {
				allCases: [false],
			},
		},
	},
	...returnAllAndLimit,
	genericFiltersCollection,
	sortCollection,
	searchOptions,
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

	const allCases = this.getNodeParameter('allCases', i) as boolean;
	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
	const { returnCount, extraData } = this.getNodeParameter('options', i);

	let limit;
	let scope: QueryScope;

	if (allCases) {
		scope = { query: 'listTask' };
	} else {
		const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
		scope = { query: 'getCase', id: caseId, restrictTo: 'tasks' };
	}

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	responseData = await theHiveApiQuery.call(
		this,
		scope,
		filtersValues,
		sortFields,
		limit,
		returnCount as boolean,
		extraData as string[],
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
