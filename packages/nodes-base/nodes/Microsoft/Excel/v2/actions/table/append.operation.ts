import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { processJsonInput, updateDisplayOptions } from '../../../../../../utils/utilities';
import type { ExcelResponse } from '../../helpers/interfaces';
import { prepareOutput } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	tableRLC,
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'define',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMap',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'define',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Send raw data as JSON',
			},
		],
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		required: true,
		placeholder: 'e.g. [["Sara","1/2/2006","Berlin"],["George","5/3/2010","Paris"]]',
		description: 'Raw values for the specified range as array of string arrays in JSON format',
		displayOptions: {
			show: {
				dataMode: ['raw'],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['define'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['table.value', 'worksheet.value', 'workbook.value'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						requiresDataPath: 'single',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Index',
				name: 'index',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description:
					'Specifies the relative position of the new row. If not defined, the addition happens at the end. Any row below the inserted row will be shifted downwards. First row index is 0.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
				default: 0,
				description:
					'Whether the data should be returned RAW instead of parsed into keys according to their header',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
				description: 'The name of the property into which to write the RAW data',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['append'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://docs.microsoft.com/en-us/graph/api/table-post-rows?view=graph-rest-1.0&tabs=http
	const returnData: INodeExecutionData[] = [];

	try {
		// TODO: At some point it should be possible to use item dependent parameters.
		//       Is however important to then not make one separate request each.
		const workbookId = this.getNodeParameter('workbook', 0, undefined, {
			extractValue: true,
		}) as string;

		const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
			extractValue: true,
		}) as string;

		const tableId = this.getNodeParameter('table', 0, undefined, {
			extractValue: true,
		}) as string;

		const dataMode = this.getNodeParameter('dataMode', 0) as string;

		// Get table columns to eliminate any columns not needed on the input
		const columnsData = await microsoftApiRequest.call(
			this,
			'GET',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
			{},
		);
		const columnsRow = columnsData.value.map((column: IDataObject) => column.name);

		const body: IDataObject = {};

		let values: string[][] = [];

		if (dataMode === 'raw') {
			const data = this.getNodeParameter('data', 0);
			values = processJsonInput(data, 'Data') as string[][];
		}

		if (dataMode === 'autoMap') {
			const itemsData = items.map((item) => item.json);
			for (const item of itemsData) {
				const updateRow: string[] = [];

				for (const column of columnsRow) {
					updateRow.push(item[column] as string);
				}

				values.push(updateRow);
			}
		}

		if (dataMode === 'define') {
			const itemsData: IDataObject[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const updateData: IDataObject = {};
				const definedFields = this.getNodeParameter('fieldsUi.values', itemIndex, []) as Array<{
					column: string;
					fieldValue: string;
				}>;
				for (const entry of definedFields) {
					updateData[entry.column] = entry.fieldValue;
				}
				itemsData.push(updateData);
			}

			for (const item of itemsData) {
				const updateRow: string[] = [];

				for (const column of columnsRow) {
					updateRow.push(item[column] as string);
				}

				values.push(updateRow);
			}
		}

		body.values = values;

		const options = this.getNodeParameter('options', 0);

		if (options.index) {
			body.index = options.index as number;
		}

		const { id } = await microsoftApiRequest.call(
			this,
			'POST',
			`/drive/items/${workbookId}/workbook/createSession`,
			{ persistChanges: true },
		);
		const responseData = await microsoftApiRequest.call(
			this,
			'POST',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows/add`,
			body,
			{},
			'',
			{ 'workbook-session-id': id },
		);
		await microsoftApiRequest.call(
			this,
			'POST',
			`/drive/items/${workbookId}/workbook/closeSession`,
			{},
			{},
			'',
			{ 'workbook-session-id': id },
		);

		const rawData = options.rawData as boolean;
		const dataProperty = (options.dataProperty as string) || 'data';

		returnData.push(
			...prepareOutput(this.getNode(), responseData as ExcelResponse, {
				columnsRow,
				dataProperty,
				rawData,
			}),
		);
	} catch (error) {
		if (this.continueOnFail()) {
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: 0 } },
			);
			returnData.push(...executionErrorData);
		} else {
			throw error;
		}
	}

	return returnData;
}
