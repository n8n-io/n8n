import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import {
	taskRLC,
	genericFiltersCollection,
	returnAllAndLimit,
	sortCollection,
	searchOptions,
} from '../../descriptions';
import type { QueryScope } from '../../helpers/interfaces';
import { theHiveApiQuery } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Search in All Tasks',
		name: 'allTasks',
		type: 'boolean',
		default: true,
		description: 'Whether to search in all tasks or only in selected task',
	},
	{
		...taskRLC,
		displayOptions: {
			show: {
				allTasks: [false],
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
		resource: ['log'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const allTasks = this.getNodeParameter('allTasks', i) as boolean;
	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
	const { returnCount, extraData } = this.getNodeParameter('options', i);

	let limit;
	let scope: QueryScope;

	if (allTasks) {
		scope = { query: 'listLog' };
	} else {
		const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;
		scope = { query: 'getTask', id: taskId, restrictTo: 'logs' };
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
