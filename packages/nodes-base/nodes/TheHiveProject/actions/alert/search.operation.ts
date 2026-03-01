import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import {
	genericFiltersCollection,
	returnAllAndLimit,
	searchOptions,
	sortCollection,
} from '../../descriptions';
import { theHiveApiQuery } from '../../transport';

const properties: INodeProperties[] = [
	...returnAllAndLimit,
	genericFiltersCollection,
	sortCollection,
	searchOptions,
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
	const { returnCount, extraData } = this.getNodeParameter('options', i);
	let limit;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	responseData = await theHiveApiQuery.call(
		this,
		{ query: 'listAlert' },
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
