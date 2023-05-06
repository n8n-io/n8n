import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { processJsonInput, updateDisplayOptions } from '../../../../../../utils/utilities';
import type { ExcelResponse } from '../../helpers/interfaces';
import { prepareOutput } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
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
							loadOptionsDependsOn: ['worksheet.value'],
							loadOptionsMethod: 'getWorksheetColumnRow',
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
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
		resource: ['worksheet'],
		operation: ['append'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const workbookId = this.getNodeParameter('workbook', 0, undefined, {
		extractValue: true,
	}) as string;

	const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
		extractValue: true,
	}) as string;

	const dataMode = this.getNodeParameter('dataMode', 0) as string;

	const worksheetData = await microsoftApiRequest.call(
		this,
		'GET',
		`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
	);

	let values: string[][] = [];

	if (dataMode === 'raw') {
		const data = this.getNodeParameter('data', 0);
		values = processJsonInput(data, 'Data') as string[][];
	}

	const columnsRow = (worksheetData.values as string[][])[0];

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

	const { address } = worksheetData;
	const usedRange = address.split('!')[1];

	const [rangeFrom, rangeTo] = usedRange.split(':');
	const cellDataFrom = rangeFrom.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
	const cellDataTo = rangeTo.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];

	const from = `${cellDataFrom[1]}${Number(cellDataTo[2]) + 1}`;
	const to = `${cellDataTo[1]}${Number(cellDataTo[2]) + Number(values.length)}`;

	const responseData: ExcelResponse = await microsoftApiRequest.call(
		this,
		'PATCH',
		`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${from}:${to}')`,
		{ values },
	);

	const rawData = this.getNodeParameter('options.rawData', 0, false) as boolean;
	const dataProperty = this.getNodeParameter('options.dataProperty', 0, 'data') as string;

	returnData.push(
		...prepareOutput(this.getNode(), responseData, { columnsRow, dataProperty, rawData }),
	);

	return returnData;
}
