import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { genericFiltersCollection, returnAllAndLimit, sortCollection } from '../common.description';
import { theHiveApiQuery } from '../../transport';

const properties: INodeProperties[] = [
	...returnAllAndLimit,
	genericFiltersCollection,
	sortCollection,
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

	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
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
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
