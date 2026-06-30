import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequestAllItemsSkip } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	tableRLC,
	{
		displayName: 'Lookup Column',
		name: 'lookupColumn',
		type: 'string',
		default: '',
		placeholder: 'Email',
		required: true,
		description: 'The name of the column in which to look for value',
	},
	{
		displayName: 'Lookup Value',
		name: 'lookupValue',
		type: 'string',
		default: '',
		placeholder: 'frank@example.com',
		required: true,
		description: 'The value to look for in column',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Return All Matches',
				name: 'returnAllMatches',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default only the first result gets returned. If options gets set all found matches get returned.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['lookup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const qs: IDataObject = {};
		try {
			const workbookId = this.getNodeParameter('workbook', i, undefined, {
				extractValue: true,
			}) as string;

			const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
				extractValue: true,
			}) as string;

			const tableId = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;

			const lookupColumn = this.getNodeParameter('lookupColumn', i) as string;
			const lookupValue = this.getNodeParameter('lookupValue', i) as string;
			const options = this.getNodeParameter('options', i);

			let responseData = await microsoftApiRequestAllItemsSkip.call(
				this,
				'value',
				'GET',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
				{},
				{},
			);

			qs.$select = 'name';
			// TODO: That should probably be cached in the future
			let columns = await microsoftApiRequestAllItemsSkip.call(
				this,
				'value',
				'GET',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
				{},
				qs,
			);
			columns = columns.map((column: IDataObject) => column.name);

			if (!columns.includes(lookupColumn)) {
				throw new NodeApiError(this.getNode(), responseData as JsonObject, {
					message: `Column ${lookupColumn} does not exist on the table selected`,
				});
			}

			const result: IDataObject[] = [];

			for (let index = 0; index < responseData.length; index++) {
				const object: IDataObject = {};
				for (let y = 0; y < columns.length; y++) {
					object[columns[y]] = responseData[index].values[0][y];
				}
				result.push({ ...object });
			}

			if (options.returnAllMatches) {
				responseData = result.filter((data: IDataObject) => {
					return data[lookupColumn]?.toString() === lookupValue;
				});
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} else {
				responseData = result.find((data: IDataObject) => {
					return data[lookupColumn]?.toString() === lookupValue;
				});
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
