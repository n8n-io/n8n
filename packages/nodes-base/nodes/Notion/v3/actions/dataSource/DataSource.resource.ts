import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { dataSourceFields, dataSourceOperations } from '../../descriptions/DataSourceDescription';
import {
	flattenDataSources,
	getSearchSort,
	handleOperationError,
	simplifyObjects,
} from '../../helpers/utils';
import {
	notionApiRequestAllItemsV3,
	notionApiRequestV3,
	resolveDataSourceId,
} from '../../transport';

export const description: INodeProperties[] = [...dataSourceOperations, ...dataSourceFields];

export async function get(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const selectedDataSourceId = this.getNodeParameter('dataSourceId', i, '', {
				extractValue: true,
			}) as string;
			const dataSourceId = resolveDataSourceId.call(this, selectedDataSourceId);
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'GET',
				`/data_sources/${dataSourceId}`,
			);
			if (this.getNodeParameter('simple', i) as boolean)
				response = simplifyObjects(response, false, 3);
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}

export async function search(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const text = this.getNodeParameter('text', i) as string;
			const returnAll = this.getNodeParameter('returnAll', i);
			const body: IDataObject = { filter: { property: 'object', value: 'data_source' } };
			if (text) body.query = text;
			const sort = getSearchSort.call(this, i);
			if (sort) body.sort = sort;

			const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
			if (limit) body.page_size = Math.min(limit, 100);

			const response = await notionApiRequestAllItemsV3.call(
				this,
				'results',
				'POST',
				'/search',
				body,
				limit ? { limit } : {},
			);
			let dataSources: IDataObject | IDataObject[] = flattenDataSources(response);
			if (this.getNodeParameter('simple', i) as boolean) {
				dataSources = simplifyObjects(dataSources, false, 3);
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(dataSources),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}
