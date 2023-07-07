import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { filtersCollection, returnAllAndLimit, sortCollection } from '../common.description';
import { theHiveApiListQuery } from '../../transport';

const properties: INodeProperties[] = [...returnAllAndLimit, filtersCollection, sortCollection];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const filters = this.getNodeParameter('filters', i, {});
	const sortFields = this.getNodeParameter('sort.fields', i, []) as IDataObject[];
	const returnAll = this.getNodeParameter('returnAll', i);
	let limit;

	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	responseData = await theHiveApiListQuery.call(this, 'listCase', filters, sortFields, limit);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
