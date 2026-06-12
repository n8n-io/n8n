import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	collectWorkbooksFromSearch,
	fetchPersonalOneDriveWorkbooks,
	resolveWorkbookSource,
} from '../../helpers/workbookSource';
import { workbookSourceOption } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName:
			'"Return All" can return a very large number of files, especially when Source is set to "Everything" on a large organization. Consider setting a limit instead.',
		name: 'returnAllNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				returnAll: [true],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			workbookSourceOption,
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of the fields to include in the response',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['workbook'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i) as boolean;
			const filters = this.getNodeParameter('filters', i) as IDataObject;
			const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
			const source = resolveWorkbookSource(filters.workbookSource, this.getNode().typeVersion ?? 0);
			const fields = filters.fields as string | undefined;

			const workbooks =
				source === 'oneDrive'
					? await fetchPersonalOneDriveWorkbooks.call(this, { returnAll, limit, fields })
					: await collectWorkbooksFromSearch.call(this, source, { limit, fields });

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(workbooks),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
