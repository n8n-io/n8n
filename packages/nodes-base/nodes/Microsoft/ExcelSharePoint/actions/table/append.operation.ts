import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { generatePairedItemData, processJsonInput, updateDisplayOptions } from '@utils/utilities';

import type { ExcelResponse } from '../../../Excel/v2/helpers/interfaces';
// Reused from the OneDrive node so output shaping cannot drift
import { prepareOutput } from '../../../Excel/v2/helpers/utils';
import {
	libraryRLC,
	siteRLC,
	tableRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { autoMapRow, defineRow, type FieldEntry } from '../../helpers/dataModes';
import { withWorkbookSession } from '../../helpers/sessions';
import { fetchTableColumnNames } from '../../helpers/tableRead';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
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
				name: 'RAW',
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		placeholder: 'Add option',
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
	// https://learn.microsoft.com/en-us/graph/api/table-post-rows
	const returnData: INodeExecutionData[] = [];

	try {
		// Whole-batch operation: one request set for all items, params read at item 0.
		const workbookRoot = await resolveWorkbookRoot.call(this, 0);
		const tableId = validatePathSegment(
			this.getNode(),
			'Table',
			this.getNodeParameter('table', 0, '', { extractValue: true }) as string,
		);
		const tableEndpoint = `${workbookRoot}/workbook/tables/${encodeURIComponent(tableId)}`;

		const dataMode = this.getNodeParameter('dataMode', 0) as string;
		const columnsRow = await fetchTableColumnNames.call(this, tableEndpoint);

		let values: unknown[][];
		if (dataMode === 'raw') {
			values = processJsonInput(this.getNodeParameter('data', 0), 'Data') as string[][];
		} else if (dataMode === 'autoMap') {
			values = items.map((item) => autoMapRow(item.json, columnsRow));
		} else {
			values = items.map((_, itemIndex) =>
				defineRow(
					this.getNodeParameter('fieldsUi.values', itemIndex, []) as FieldEntry[],
					columnsRow,
				),
			);
		}

		const options = this.getNodeParameter('options', 0, {}) as {
			index?: number;
			rawData?: boolean;
			dataProperty?: string;
		};
		const body: IDataObject = { values };
		if (options.index) {
			body.index = options.index;
		}

		const responseData = await (withWorkbookSession<ExcelResponse>).call(
			this,
			workbookRoot,
			async (headers) =>
				await (microsoftApiRequest<ExcelResponse>).call(
					this,
					'POST',
					`${tableEndpoint}/rows/add`,
					body,
					{},
					undefined,
					headers,
				),
		);

		returnData.push(
			...prepareOutput.call(this, this.getNode(), responseData, {
				columnsRow,
				dataProperty: options.dataProperty ?? 'data',
				rawData: options.rawData ?? false,
			}),
		);
	} catch (error) {
		if (!this.continueOnFail()) throw error;
		const message = error instanceof Error ? error.message : String(error);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: message }), {
				itemData: generatePairedItemData(items.length),
			}),
		);
	}

	return returnData;
}
