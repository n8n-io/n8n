import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { handleOperationError, simplifyObjects } from '../../helpers/utils';
import { notionApiRequestV3 } from '../../transport';
import { databaseLocator } from '../common.descriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['database'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get database metadata and its data sources',
				action: 'Get a database',
			},
		],
		default: 'get',
	},
	{
		...databaseLocator,
		displayName: 'Database',
		name: 'databaseId',
		displayOptions: { show: { resource: ['database'], operation: ['get'] } },
		description:
			'The Notion database to retrieve. Use Data Source operations to search, query, or create database pages.',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['database'], operation: ['get'] } },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

export async function get(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const databaseId = this.getNodeParameter('databaseId', i, '', {
				extractValue: true,
			}) as string;
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'GET',
				`/databases/${databaseId}`,
			);
			if (this.getNodeParameter('simple', i) as boolean) {
				response = simplifyObjects(response, false, 3);
			}
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
