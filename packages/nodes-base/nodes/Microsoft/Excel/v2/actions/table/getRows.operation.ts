import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequest, microsoftApiRequestAllItemsSkip } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	tableRLC,
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
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		default: false,
		description:
			'Whether the data should be returned RAW instead of parsed into keys according to their header',
	},
	{
		displayName: 'Data Property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
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
				displayOptions: {
					show: {
						'/rawData': [true],
					},
				},
			},
			{
				displayName: 'Column Names or IDs',
				name: 'column',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsDependsOn: ['table.value', 'worksheet.value', 'workbook.value'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: [],
				displayOptions: {
					show: {
						'/rawData': [false],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['getRows'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://docs.microsoft.com/en-us/graph/api/table-list-rows?view=graph-rest-1.0&tabs=http
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

			const filters = this.getNodeParameter('filters', i);
			const returnAll = this.getNodeParameter('returnAll', i);
			const rawData = this.getNodeParameter('rawData', i);

			if (rawData) {
				if (filters.fields) {
					qs.$select = filters.fields;
				}
			}

			let responseData;
			if (returnAll) {
				responseData = await microsoftApiRequestAllItemsSkip.call(
					this,
					'value',
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
					{},
					qs,
				);
			} else {
				const rowsQs = { ...qs };
				rowsQs.$top = this.getNodeParameter('limit', i);
				responseData = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
					{},
					rowsQs,
				);
				responseData = responseData.value;
			}
			if (!rawData) {
				const columnsQs = { ...qs };
				columnsQs.$select = 'name';
				// TODO: That should probably be cached in the future
				let columns = await microsoftApiRequestAllItemsSkip.call(
					this,
					'value',
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
					{},
					columnsQs,
				);

				columns = (columns as IDataObject[]).map((column) => column.name);

				let rows: INodeExecutionData[] = [];
				for (let index = 0; index < responseData.length; index++) {
					const object: IDataObject = {};
					for (let y = 0; y < columns.length; y++) {
						object[columns[y]] = responseData[index].values[0][y];
					}
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ ...object }),
						{ itemData: { item: index } },
					);

					rows.push(...executionData);
				}

				if ((filters?.column as string[])?.length) {
					rows = rows.map((row) => {
						const rowData: IDataObject = {};
						Object.keys(row.json).forEach((key) => {
							if ((filters.column as string[]).includes(key)) {
								rowData[key] = row.json[key];
							}
						});
						return { ...rowData, json: rowData };
					});
				}

				returnData.push(...rows);
			} else {
				const dataProperty = this.getNodeParameter('dataProperty', i) as string;
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ [dataProperty]: responseData }),
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
