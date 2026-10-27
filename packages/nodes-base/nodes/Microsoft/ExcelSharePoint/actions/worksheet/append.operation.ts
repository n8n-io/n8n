import type { IExecuteFunctions, INode, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions } from '@utils/utilities';

import type { ExcelResponse, SheetRow } from '../../../Excel/v2/helpers/interfaces';
// Reused from the OneDrive node so range math and output shaping cannot drift
import {
	findAppendRange,
	nextExcelColumn,
	parseAddress,
	prepareOutput,
} from '../../../Excel/v2/helpers/utils';
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
	isEmptySheet,
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
	/** Only populated (and only read) when `dataMode` is 'raw'; already validated as an array of arrays of strings. */
	rawRows: SheetRow[];
	/** When true, return Graph's response as-is under `dataProperty` instead of parsing rows into keyed objects. */
	rawData: boolean;
	/** Output property to write the raw response under. Only used when `rawData` is true. */
	dataProperty: string;
};

// Structural parameters (which sheet, which data mode, RAW input) aren't
// per-item, the same as the OneDrive node: read once, up front, so the
// request-building code below only ever deals with `settings.xxx`.
function getSettings(this: IExecuteFunctions): AppendSettings {
	const worksheetId = validatePathSegment(
		this.getNode(),
		'Sheet',
		this.getNodeParameter('worksheet', 0, '', { extractValue: true }) as string,
	);

	const dataMode = this.getNodeParameter('dataMode', 0) as DataMode;

	const rawRows =
		dataMode === 'raw'
			? assertRawRows(this.getNode(), processJsonInput(this.getNodeParameter('data', 0), 'Data'))
			: [];

	const options = this.getNodeParameter('options', 0, {}) as {
		rawData?: boolean;
		dataProperty?: string;
	};

	return {
		worksheetId,
		dataMode,
		rawRows,
		rawData: options.rawData || false,
		dataProperty: options.dataProperty || 'data',
	};
}

type MappedDataMode = 'autoMap' | 'define';
type RowResult = { itemIndex: number; row: SheetRow };
type RowError = { itemIndex: number; error: Error };

/** How to seed the header row from the first item, when the sheet has no data yet. */
function columnSeeder(
	dataMode: MappedDataMode,
	items: INodeExecutionData[],
	getFields: (itemIndex: number) => FieldEntry[],
): (itemIndex: number) => string[] {
	return dataMode === 'autoMap'
		? (itemIndex) => columnsFromItem(items[itemIndex].json)
		: (itemIndex) => columnsFromFields(getFields(itemIndex));
}

// autoMap/define build one row per item; a bad item (an expression failure, say)
// is skipped under continue-on-fail rather than blocking the batch — the one
// departure from the OneDrive node, which has no such isolation. The write
// itself still happens once for the whole batch, same as OneDrive.
function buildItemRows(
	items: INodeExecutionData[],
	continueOnFail: boolean,
	dataMode: MappedDataMode,
	getFields: (itemIndex: number) => FieldEntry[],
	seedColumns: (itemIndex: number) => string[],
): { columnsRow: string[]; okRows: RowResult[]; errorRows: RowError[] } {
	let columnsRow: string[] | undefined;
	const okRows: RowResult[] = [];
	const errorRows: RowError[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			if (!columnsRow) columnsRow = seedColumns(i);

			const row =
				dataMode === 'autoMap'
					? autoMapRow(items[i].json, columnsRow)
					: defineRow(getFields(i), columnsRow);

			okRows.push({ itemIndex: i, row });
		} catch (error) {
			if (!continueOnFail) throw error;
			errorRows.push({ itemIndex: i, error: error as Error });
		}
	}

	return { columnsRow: columnsRow ?? [], okRows, errorRows };
}

/**
 * `findAppendRange` treats any single-cell used-range address as an empty
 * table and starts writing at that same cell — correct for a genuinely blank
 * sheet, but it would overwrite a one-column sheet's real header if that
 * header is the sheet's only populated cell. This computes the row below it
 * instead, for that one case `findAppendRange` can't tell apart.
 */
function appendBelowSingleCell(address: string, cols: number, rows: number): string {
	const { cellFrom } = parseAddress(address);
	const startRow = Number(cellFrom.row) + 1;
	const endColumn = nextExcelColumn(cellFrom.column, Math.max(cols - 1, 0));
	return `${cellFrom.column}${startRow}:${endColumn}${startRow + Math.max(rows - 1, 0)}`;
}

/** Reassembles per-item output, keyed by original item index, back into that same order. */
function combineInOrder(
	itemCount: number,
	byIndex: Map<number, INodeExecutionData[]>,
): INodeExecutionData[] {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < itemCount; i++) {
		const entries = byIndex.get(i);
		if (entries) returnData.push.apply(returnData, entries);
	}
	return returnData;
}

// RAW mode never gets an auto-written header, and (like the OneDrive node)
// isn't a per-item concept: one blob of rows for the whole batch, in one write.
async function executeRaw(
	this: IExecuteFunctions,
	sheetPath: string,
	usedRangeAddress: string,
	existingColumns: string[] | undefined,
	settings: AppendSettings,
): Promise<INodeExecutionData[]> {
	const range = findAppendRange(usedRangeAddress, {
		cols: settings.rawRows[0]?.length ?? 0,
		rows: settings.rawRows.length,
	});
	const responseData = await (microsoftApiRequest<ExcelResponse>).call(
		this,
		'PATCH',
		`${sheetPath}/range(address='${range}')`,
		{ values: settings.rawRows },
	);

	return prepareOutput.call(this, this.getNode(), responseData, {
		columnsRow: existingColumns,
		dataProperty: settings.dataProperty,
		rawData: settings.rawData,
	});
}

// autoMap/define: one row per item, written together in a single PATCH.
async function executeMapped(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	sheetPath: string,
	usedRangeAddress: string,
	isEmpty: boolean,
	existingColumns: string[] | undefined,
	settings: AppendSettings,
): Promise<INodeExecutionData[]> {
	const dataMode = settings.dataMode as MappedDataMode;
	const getFields = (itemIndex: number) =>
		this.getNodeParameter('fieldsUi.values', itemIndex, []) as FieldEntry[];
	const seedColumns =
		existingColumns !== undefined
			? () => existingColumns
			: columnSeeder(dataMode, items, getFields);

	const { columnsRow, okRows, errorRows } = buildItemRows(
		items,
		this.continueOnFail(),
		dataMode,
		getFields,
		seedColumns,
	);

	const outputByIndex = new Map<number, INodeExecutionData[]>();
	for (const { itemIndex, error } of errorRows) {
		outputByIndex.set(
			itemIndex,
			this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: itemIndex } },
			),
		);
	}

	if (okRows.length > 0) {
		// Only write the header once, the first time there's data to seed it from
		const writesHeader = isEmpty;
		const rowsToWrite = writesHeader
			? [columnsRow, ...okRows.map((r) => r.row)]
			: okRows.map((r) => r.row);

		// A one-column sheet with only its header looks identical to a blank
		// sheet to findAppendRange (both are single-cell addresses) — write
		// below that cell explicitly instead of letting it assume row 1 is free
		const range =
			isEmptyUsedRange(usedRangeAddress) && !writesHeader
				? appendBelowSingleCell(usedRangeAddress, rowsToWrite[0]?.length ?? 0, rowsToWrite.length)
				: findAppendRange(usedRangeAddress, {
						cols: rowsToWrite[0]?.length ?? 0,
						rows: rowsToWrite.length,
					});
		const responseData = await (microsoftApiRequest<ExcelResponse>).call(
			this,
			'PATCH',
			`${sheetPath}/range(address='${range}')`,
			{ values: rowsToWrite },
		);

		if (settings.rawData) {
			// One RAW blob represents the whole write, not one entry per item —
			// matches the OneDrive node's own RAW-output shape
			outputByIndex.set(
				okRows[0].itemIndex,
				this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ [settings.dataProperty]: responseData }),
					{ itemData: okRows.map((r) => ({ item: r.itemIndex })) },
				),
			);
		} else {
			// When we just wrote the header ourselves, Graph echoes it back as row 0
			// of the response — prepareOutput's default keyRow picks it up, so
			// passing columnsRow here would double it up
			const preparedData = prepareOutput.call(this, this.getNode(), responseData, {
				columnsRow: writesHeader ? undefined : columnsRow,
				dataProperty: settings.dataProperty,
				rawData: false,
			});
			preparedData.forEach((entry, index) => {
				outputByIndex.set(okRows[index].itemIndex, [
					{ ...entry, pairedItem: { item: okRows[index].itemIndex } },
				]);
			});
		}
	}

	return combineInOrder(items.length, outputByIndex);
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/worksheet-range
	const settings = getSettings.call(this);

	const workbookRoot = await resolveWorkbookRoot.call(this, 0);
	const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(settings.worksheetId)}`;

	const usedRange = await (microsoftApiRequest<ExcelResponse & { address: string }>).call(
		this,
		'GET',
		`${sheetPath}/usedRange`,
	);

	// An empty sheet has no header row to read; the raw/mapped writers seed one
	// from the input instead of throwing (the OneDrive node's behaviour). RAW
	// mode keeps the OneDrive node's address-only check for exact parity.
	if (settings.dataMode === 'raw') {
		const isEmpty = isEmptyUsedRange(usedRange.address);
		const existingColumns = isEmpty ? undefined : ((usedRange.values?.[0] as string[]) ?? []);
		return await executeRaw.call(this, sheetPath, usedRange.address, existingColumns, settings);
	}

	// autoMap/define also have to tell a genuinely empty sheet apart from a
	// one-column sheet whose only cell already holds real data (its header) —
	// the address alone can't do that, unlike the RAW-mode check above
	const firstRow: SheetRow | undefined = usedRange.values?.[0];
	const isEmpty = isEmptySheet(usedRange.address, firstRow);
	const existingColumns = isEmpty ? undefined : ((firstRow as string[]) ?? []);

	return await executeMapped.call(
		this,
		items,
		sheetPath,
		usedRange.address,
		isEmpty,
		existingColumns,
		settings,
	);
}
