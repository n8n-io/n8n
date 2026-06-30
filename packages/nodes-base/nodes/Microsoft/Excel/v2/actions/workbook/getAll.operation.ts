import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	getExcelCredentialType,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
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
			if (getExcelCredentialType.call(this) === 'microsoftEntraServicePrincipalApi') {
				// App-only Graph can't search a drive, so this listing is unsupported under SP.
				throw new NodeOperationError(
					this.getNode(),
					'Search is not supported with the Service Principal credential',
					{
						itemIndex: i,
						description:
							'App-only Microsoft Graph cannot search a drive. Reference the workbook By ID in the read/write operations, or use an OAuth2 credential to list workbooks.',
					},
				);
			}
			const returnAll = this.getNodeParameter('returnAll', i);
			const filters = this.getNodeParameter('filters', i);
			const qs: IDataObject = {};
			if (filters.fields) {
				qs.$select = filters.fields;
			}
			let responseData;
			if (returnAll) {
				responseData = await microsoftApiRequestAllItems.call(
					this,
					'value',
					'GET',
					"/drive/root/search(q='.xlsx')",
					{},
					qs,
				);
			} else {
				qs.$top = this.getNodeParameter('limit', i);
				responseData = await microsoftApiRequest.call(
					this,
					'GET',
					"/drive/root/search(q='.xlsx')",
					{},
					qs,
				);
				responseData = responseData.value;
			}

			if (Array.isArray(responseData)) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} else if (responseData !== undefined) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
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
