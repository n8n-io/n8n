import { NodeOperationError } from 'n8n-workflow';
import { processJsonInput, updateDisplayOptions } from '@utils/utilities';
// Reused from the OneDrive node so range math and output shaping cannot drift
import { findAppendRange, nextExcelColumn, parseAddress, prepareOutput, } from '../../../Excel/v2/helpers/utils';
import { workbookRLC, siteRLC, libraryRLC, worksheetRLC, } from '../../descriptions/common.descriptions';
import { autoMapRow, columnsFromFields, columnsFromItem, defineRow, isEmptySheet, isEmptyUsedRange, } from '../../helpers/dataModes';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [
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
                description: 'Whether the data should be returned RAW instead of parsed into keys according to their header',
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
function assertRawRows(node, parsed) {
    const isArray = Array.isArray(parsed);
    const isRowArray = isArray && parsed.every((row) => Array.isArray(row));
    const isStringRowArray = isRowArray && parsed.flat().every((cell) => typeof cell === 'string');
    if (!isStringRowArray) {
        throw new NodeOperationError(node, 'Data must be an array of arrays of strings');
    }
    return parsed;
}
// Structural parameters (which sheet, which data mode, RAW input) aren't
// per-item, the same as the OneDrive node: read once, up front, so the
// request-building code below only ever deals with `settings.xxx`.
function getSettings() {
    const worksheetId = validatePathSegment(this.getNode(), 'Sheet', this.getNodeParameter('worksheet', 0, '', { extractValue: true }));
    const dataMode = this.getNodeParameter('dataMode', 0);
    const rawRows = dataMode === 'raw'
        ? assertRawRows(this.getNode(), processJsonInput(this.getNodeParameter('data', 0), 'Data'))
        : [];
    const options = this.getNodeParameter('options', 0, {});
    return {
        worksheetId,
        dataMode,
        rawRows,
        rawData: options.rawData || false,
        dataProperty: options.dataProperty || 'data',
    };
}
/** How to seed the header row from the first item, when the sheet has no data yet. */
function columnSeeder(dataMode, items, getFields) {
    return dataMode === 'autoMap'
        ? (itemIndex) => columnsFromItem(items[itemIndex].json)
        : (itemIndex) => columnsFromFields(getFields(itemIndex));
}
// autoMap/define build one row per item; a bad item (an expression failure, say)
// is skipped under continue-on-fail rather than blocking the batch — the one
// departure from the OneDrive node, which has no such isolation. The write
// itself still happens once for the whole batch, same as OneDrive.
function buildItemRows(items, continueOnFail, dataMode, getFields, seedColumns) {
    let columnsRow;
    const okRows = [];
    const errorRows = [];
    for (let i = 0; i < items.length; i++) {
        try {
            if (!columnsRow)
                columnsRow = seedColumns(i);
            const row = dataMode === 'autoMap'
                ? autoMapRow(items[i].json, columnsRow)
                : defineRow(getFields(i), columnsRow);
            okRows.push({ itemIndex: i, row });
        }
        catch (error) {
            if (!continueOnFail)
                throw error;
            errorRows.push({ itemIndex: i, error: error });
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
function appendBelowSingleCell(address, cols, rows) {
    const { cellFrom } = parseAddress(address);
    const startRow = Number(cellFrom.row) + 1;
    const endColumn = nextExcelColumn(cellFrom.column, Math.max(cols - 1, 0));
    return `${cellFrom.column}${startRow}:${endColumn}${startRow + Math.max(rows - 1, 0)}`;
}
/** Reassembles per-item output, keyed by original item index, back into that same order. */
function combineInOrder(itemCount, byIndex) {
    const returnData = [];
    for (let i = 0; i < itemCount; i++) {
        const entries = byIndex.get(i);
        if (entries)
            returnData.push.apply(returnData, entries);
    }
    return returnData;
}
// RAW mode never gets an auto-written header, and (like the OneDrive node)
// isn't a per-item concept: one blob of rows for the whole batch, in one write.
async function executeRaw(sheetPath, usedRangeAddress, existingColumns, settings) {
    const range = findAppendRange(usedRangeAddress, {
        cols: settings.rawRows[0]?.length ?? 0,
        rows: settings.rawRows.length,
    });
    const responseData = await (microsoftApiRequest).call(this, 'PATCH', `${sheetPath}/range(address='${range}')`, { values: settings.rawRows });
    return prepareOutput.call(this, this.getNode(), responseData, {
        columnsRow: existingColumns,
        dataProperty: settings.dataProperty,
        rawData: settings.rawData,
    });
}
// autoMap/define: one row per item, written together in a single PATCH.
async function executeMapped(items, sheetPath, usedRangeAddress, isEmpty, existingColumns, settings) {
    const dataMode = settings.dataMode;
    const getFields = (itemIndex) => this.getNodeParameter('fieldsUi.values', itemIndex, []);
    const seedColumns = existingColumns !== undefined
        ? () => existingColumns
        : columnSeeder(dataMode, items, getFields);
    const { columnsRow, okRows, errorRows } = buildItemRows(items, this.continueOnFail(), dataMode, getFields, seedColumns);
    const outputByIndex = new Map();
    for (const { itemIndex, error } of errorRows) {
        outputByIndex.set(itemIndex, this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: itemIndex } }));
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
        const range = isEmptyUsedRange(usedRangeAddress) && !writesHeader
            ? appendBelowSingleCell(usedRangeAddress, rowsToWrite[0]?.length ?? 0, rowsToWrite.length)
            : findAppendRange(usedRangeAddress, {
                cols: rowsToWrite[0]?.length ?? 0,
                rows: rowsToWrite.length,
            });
        const responseData = await (microsoftApiRequest).call(this, 'PATCH', `${sheetPath}/range(address='${range}')`, { values: rowsToWrite });
        if (settings.rawData) {
            // One RAW blob represents the whole write, not one entry per item —
            // matches the OneDrive node's own RAW-output shape
            outputByIndex.set(okRows[0].itemIndex, this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ [settings.dataProperty]: responseData }), { itemData: okRows.map((r) => ({ item: r.itemIndex })) }));
        }
        else {
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
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/worksheet-range
    const settings = getSettings.call(this);
    const workbookRoot = await resolveWorkbookRoot.call(this, 0);
    const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(settings.worksheetId)}`;
    const usedRange = await (microsoftApiRequest).call(this, 'GET', `${sheetPath}/usedRange`);
    // An empty sheet has no header row to read; the raw/mapped writers seed one
    // from the input instead of throwing (the OneDrive node's behaviour). RAW
    // mode keeps the OneDrive node's address-only check for exact parity.
    if (settings.dataMode === 'raw') {
        const isEmpty = isEmptyUsedRange(usedRange.address);
        const existingColumns = isEmpty ? undefined : (usedRange.values?.[0] ?? []);
        return await executeRaw.call(this, sheetPath, usedRange.address, existingColumns, settings);
    }
    // autoMap/define also have to tell a genuinely empty sheet apart from a
    // one-column sheet whose only cell already holds real data (its header) —
    // the address alone can't do that, unlike the RAW-mode check above
    const firstRow = usedRange.values?.[0];
    const isEmpty = isEmptySheet(usedRange.address, firstRow);
    const existingColumns = isEmpty ? undefined : (firstRow ?? []);
    return await executeMapped.call(this, items, sheetPath, usedRange.address, isEmpty, existingColumns, settings);
}
//# sourceMappingURL=append.operation.js.map