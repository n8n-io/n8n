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

type ItemRow = { itemIndex: number; row: SheetRow } | { itemIndex: number; error: Error };

// autoMap/define build one row per item; a bad item (an expression failure, say)
// is recorded and skipped under continueOnFail rather than blocking the batch —
// the one departure from the OneDrive node, which has no such isolation. The
// write itself still happens once for the whole batch, same as OneDrive.
function buildItemRows(
	items: INodeExecutionData[],
	continueOnFail: boolean,
	dataMode: 'autoMap' | 'define',
	getFields: (itemIndex: number) => FieldEntry[],
	seedColumns: (itemIndex: number) => string[],
): { columnsRow: string[]; rows: ItemRow[] } {
	let columnsRow: string[] | undefined;
	const rows: ItemRow[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			if (!columnsRow) columnsRow = seedColumns(i);

			const row =
				dataMode === 'autoMap'
					? autoMapRow(items[i].json, columnsRow)
					: defineRow(getFields(i), columnsRow);

			rows.push({ itemIndex: i, row });
		} catch (error) {
			if (!continueOnFail) throw error;
			rows.push({ itemIndex: i, error: error as Error });
		}
	}

	return { columnsRow: columnsRow ?? [], rows };
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

	// An empty sheet has no header row to read; seed one from the first
	// successfully-built item instead of throwing (the OneDrive node's
	// behaviour for autoMap/define)
	const isEmpty = isEmptyUsedRange(usedRange.address);
	const existingColumns = isEmpty ? undefined : ((usedRange.values?.[0] as string[]) ?? []);

	if (settings.dataMode === 'raw') {
		const range = findAppendRange(usedRange.address, {
			cols: settings.rawRows[0]?.length ?? 0,
			rows: settings.rawRows.length,
		});
		const responseData = await (microsoftApiRequest<ExcelResponse>).call(
			this,
			'PATCH',
			`${sheetPath}/range(address='${range}')`,
			{ values: settings.rawRows },
		);

		// RAW mode never gets an auto-written header, and (like the OneDrive
		// node) isn't a per-item concept: one blob of rows for the whole batch
		return prepareOutput.call(this, this.getNode(), responseData, {
			columnsRow: existingColumns,
			dataProperty: settings.dataProperty,
			rawData: settings.rawData,
		});
	}

	const getFields = (itemIndex: number) =>
		this.getNodeParameter('fieldsUi.values', itemIndex, []) as FieldEntry[];
	const seedColumns =
		existingColumns !== undefined
			? () => existingColumns
			: settings.dataMode === 'autoMap'
				? (itemIndex: number) => columnsFromItem(items[itemIndex].json)
				: (itemIndex: number) => columnsFromFields(getFields(itemIndex));

	const { columnsRow, rows } = buildItemRows(
		items,
		this.continueOnFail(),
		settings.dataMode,
		getFields,
		seedColumns,
	);

	const outputByIndex = new Map<number, INodeExecutionData[]>();

	for (const r of rows) {
		if ('error' in r) {
			outputByIndex.set(
				r.itemIndex,
				this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: r.error.message }),
					{ itemData: { item: r.itemIndex } },
				),
			);
		}
	}

	const okRows = rows.filter((r): r is { itemIndex: number; row: SheetRow } => 'row' in r);

	if (okRows.length > 0) {
		const writesHeader = isEmpty;
		const rowsToWrite = writesHeader
			? [columnsRow, ...okRows.map((r) => r.row)]
			: okRows.map((r) => r.row);

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

	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		const entries = outputByIndex.get(i);
		if (entries) returnData.push.apply(returnData, entries);
	}
	return returnData;
}
