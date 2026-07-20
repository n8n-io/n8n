import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	rawDataOutput,
	returnAllAndLimit,
	siteRLC,
	tableRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { fetchTableCollection, resolveTableEndpoint } from '../../helpers/tableRead';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
	workbookRLC,
	worksheetRLC,
	tableRLC,
	...returnAllAndLimit,
	...rawDataOutput,
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['getColumns'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/table-list-columns
	const returnData: INodeExecutionData[] = [];

	const workbookRootCache = new Map<string, string>();
	const siteIdCache = new Map<string, string>();

	for (let i = 0; i < items.length; i++) {
		try {
			const rawData = this.getNodeParameter('rawData', i);
			const options = this.getNodeParameter('options', i, {}) as { fields?: string };

			const qs: IDataObject = {};
			if (rawData && options.fields) {
				qs.$select = options.fields;
			}

			const tableEndpoint = await resolveTableEndpoint.call(
				this,
				i,
				workbookRootCache,
				siteIdCache,
			);
			const columns = await fetchTableCollection.call(this, i, `${tableEndpoint}/columns`, qs);

			const output: IDataObject | IDataObject[] = rawData
				? { [this.getNodeParameter('dataProperty', i) as string]: columns }
				: columns.map((column) => ({ name: column.name }));

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(output),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionErrorData);
		}
	}

	return returnData;
}
