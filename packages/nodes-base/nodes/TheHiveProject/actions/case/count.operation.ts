import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiQuery } from '../../transport';
import { genericFiltersCollection } from '../../descriptions';

const properties: INodeProperties[] = [genericFiltersCollection];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['count'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const filtersValues = this.getNodeParameter('filters.values', i, []) as IDataObject[];

	responseData = await theHiveApiQuery.call(
		this,
		{ query: 'listCase' },
		filtersValues,
		undefined,
		undefined,
		true,
	);

	responseData = { count: responseData };

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
