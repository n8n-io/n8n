import type { IExecuteFunctions, INode, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions } from '@utils/utilities';

import type { ExcelResponse, SheetRow } from '../../../Excel/v2/helpers/interfaces';
// Reused from the OneDrive node so range math and output shaping cannot drift
import { findAppendRange, prepareOutput } from '../../../Excel/v2/helpers/utils';
import {
	workbookRLC,
	siteRLC,
	libraryRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import {
	autoMapRow,
	columnsFromFields,
	columnsFromItem,
	defineRow,
	isEmptyUsedRange,
	type DataMode,
	type FieldEntry,
} from '../../helpers/dataModes';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	workbookRLC,
	siteRLC,
	libraryRLC,
	worksheetRLC,
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'autoMap',
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
						displayName: 'Column',
						name: 'column',
						type: 'string',
						default: '',
						description: "Name of the destination column. Must match the sheet's header exactly.",
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
		placeholder: 'Add option',
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

/** Throws unless `parsed` is an array of arrays of strings, matching the OneDrive node's RAW input validation. */
function assertRawRows(node: INode, parsed: unknown): SheetRow[] {
	const isArray = Array.isArray(parsed);
	const isRowArray = isArray && parsed.every((row) => Array.isArray(row));
	const isStringRowArray = isRowArray && parsed.flat().every((cell) => typeof cell === 'string');
	if (!isStringRowArray) {
		throw new NodeOperationError(node, 'Data must be an array of arrays of strings');
	}
	return parsed as SheetRow[];
}

type AppendSettings = {
	/** Validated sheet resource-locator value; the segment of the request path after `/workbook/worksheets/`. */
	worksheetId: string;
	dataMode: DataMode;
	/** Only populated (and only read) when `dataMode` is 'define'. */
	definedFields: FieldEntry[];
	/** Only populated (and only read) when `dataMode` is 'raw'; already validated as an array of arrays of strings. */
	rawRows: SheetRow[];
	/** When true, return Graph's response as-is under `dataProperty` instead of parsing rows into keyed objects. */
	rawData: boolean;
	/** Output property to write the raw response under. Only used when `rawData` is true. */
	dataProperty: string;
};

// Validated and read up front so the request-building code below only ever deals
// with `settings.xxx`, never raw `getNodeParameter` calls or `options.foo as bar`.
function getSettings(this: IExecuteFunctions, itemIndex: number): AppendSettings {
	const worksheetId = validatePathSegment(
		this.getNode(),
		'Sheet',
		this.getNodeParameter('worksheet', itemIndex, '', { extractValue: true }) as string,
	);

	const dataMode = this.getNodeParameter('dataMode', itemIndex) as DataMode;

	const definedFields =
		dataMode === 'define'
			? (this.getNodeParameter('fieldsUi.values', itemIndex, []) as FieldEntry[])
			: [];

	const rawRows =
		dataMode === 'raw'
			? assertRawRows(
					this.getNode(),
					processJsonInput(this.getNodeParameter('data', itemIndex), 'Data'),
				)
			: [];

	const options = this.getNodeParameter('options', itemIndex, {}) as {
		rawData?: boolean;
		dataProperty?: string;
	};

	return {
		worksheetId,
		dataMode,
		definedFields,
		rawRows,
		rawData: options.rawData || false,
		dataProperty: options.dataProperty || 'data',
	};
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/worksheet-range
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			// Validate everything local before the workbook resolution, which may
			// cost a request in URL mode
			const settings = getSettings.call(this, i);

			const workbookRoot = await resolveWorkbookRoot.call(this, i);
			const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(settings.worksheetId)}`;

			const usedRange = await (microsoftApiRequest<ExcelResponse & { address: string }>).call(
				this,
				'GET',
				`${sheetPath}/usedRange`,
			);

			// An empty sheet has no header row to read; seed one from this item's
			// data instead of throwing (the OneDrive node's behaviour for autoMap/define)
			const isEmpty = isEmptyUsedRange(usedRange.address);

			const columnsRow = isEmpty
				? settings.dataMode === 'autoMap'
					? columnsFromItem(items[i].json)
					: settings.dataMode === 'define'
						? columnsFromFields(settings.definedFields)
						: []
				: ((usedRange.values?.[0] as string[]) ?? []);

			let values: SheetRow[];
			if (settings.dataMode === 'raw') {
				values = settings.rawRows;
			} else if (settings.dataMode === 'autoMap') {
				values = [autoMapRow(items[i].json, columnsRow)];
			} else {
				values = [defineRow(settings.definedFields, columnsRow)];
			}

			// RAW mode never gets an auto-written header: the values it sends are
			// whatever shape the builder supplied, headers included or not
			const writesHeader = settings.dataMode !== 'raw' && isEmpty;
			const rowsToWrite = writesHeader ? [columnsRow, ...values] : values;

			const range = findAppendRange(usedRange.address, {
				cols: rowsToWrite[0]?.length ?? 0,
				rows: rowsToWrite.length,
			});

			const responseData = await (microsoftApiRequest<ExcelResponse>).call(
				this,
				'PATCH',
				`${sheetPath}/range(address='${range}')`,
				{ values: rowsToWrite },
			);

			// When we just wrote the header ourselves, Graph echoes it back as
			// row 0 of the response — prepareOutput's default keyRow picks it up,
			// so passing columnsRow here would double it up
			const preparedData = prepareOutput.call(this, this.getNode(), responseData, {
				columnsRow: writesHeader ? undefined : columnsRow,
				dataProperty: settings.dataProperty,
				rawData: settings.rawData,
			});
			returnData.push.apply(returnData, preparedData);
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
