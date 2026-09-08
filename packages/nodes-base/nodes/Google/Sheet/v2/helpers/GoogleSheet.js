import { utils as xlsxUtils } from '@e965/xlsx';
import get from 'lodash/get';
import { NodeOperationError } from 'n8n-workflow';
import { getSheetId, removeEmptyColumns } from './GoogleSheets.utils';
import { apiRequest } from '../transport';
export class GoogleSheet {
    id;
    executeFunctions;
    /**
     * Single-use cache set by callers (e.g. append.operation) that have already
     * fetched the header row. Consumed and cleared by convertObjectArrayToSheetDataArray
     * to avoid a duplicate API call. Scoped to one node execution — a fresh GoogleSheet
     * instance is created per execute() call in router.ts.
     */
    columnNamesHint;
    constructor(spreadsheetId, executeFunctions) {
        this.executeFunctions = executeFunctions;
        this.id = spreadsheetId;
    }
    setColumnNamesHint(names) {
        this.columnNamesHint = names;
    }
    /**
     * Encodes the range that also none latin character work
     *
     * @param {string} range
     * @returns {string}
     * @memberof GoogleSheet
     */
    encodeRange(range) {
        if (range.includes('!')) {
            const [sheet, ranges] = range.split('!');
            return `${encodeURIComponent(sheet)}!${ranges}`;
        }
        // Use '' so that sheet is not interpreted as range
        return encodeURIComponent(`'${range}'`);
    }
    /**
     * Clears values from a sheet
     *
     * @param {string} range
     * @returns {Promise<object>}
     * @memberof GoogleSheet
     */
    async clearData(range) {
        const body = {
            spreadsheetId: this.id,
            range,
        };
        const response = await apiRequest.call(this.executeFunctions, 'POST', `/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}:clear`, body);
        return response;
    }
    /**
     * Returns the cell values
     */
    async getData(range, valueRenderMode, dateTimeRenderOption) {
        const query = {
            valueRenderOption: valueRenderMode,
            dateTimeRenderOption: 'FORMATTED_STRING',
        };
        if (dateTimeRenderOption) {
            query.dateTimeRenderOption = dateTimeRenderOption;
        }
        const response = await apiRequest.call(this.executeFunctions, 'GET', `/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}`, {}, query);
        return response.values;
    }
    /**
     * Returns the sheets in a Spreadsheet
     */
    async spreadsheetGetSheets() {
        const query = {
            fields: 'sheets.properties',
        };
        const response = await apiRequest.call(this.executeFunctions, 'GET', `/v4/spreadsheets/${this.id}`, {}, query);
        return response;
    }
    /**
     *  Returns the sheet within a spreadsheet based on name or ID
     */
    async spreadsheetGetSheet(node, mode, value) {
        const query = {
            fields: 'sheets.properties',
        };
        const response = (await apiRequest.call(this.executeFunctions, 'GET', `/v4/spreadsheets/${this.id}`, {}, query));
        const foundItem = response.sheets.find((item) => {
            if (mode === 'name')
                return item.properties.title === value;
            return item.properties.sheetId === getSheetId(value);
        });
        if (!foundItem?.properties?.title) {
            const error = new Error(`Sheet with ${mode === 'name' ? 'name' : 'ID'} ${value} not found`);
            throw new NodeOperationError(node, error, { level: 'warning' });
        }
        return foundItem.properties;
    }
    /**
     *  Returns the grid properties of a sheet
     */
    async getDataRange(sheetId) {
        const query = {
            fields: 'sheets.properties',
        };
        const response = await apiRequest.call(this.executeFunctions, 'GET', `/v4/spreadsheets/${this.id}`, {}, query);
        const foundItem = response.sheets.find((item) => item.properties.sheetId === sheetId);
        return foundItem.properties.gridProperties;
    }
    /**
     * Sets values in one or more ranges of a spreadsheet.
     */
    async spreadsheetBatchUpdate(requests) {
        const body = {
            requests,
        };
        const response = await apiRequest.call(this.executeFunctions, 'POST', `/v4/spreadsheets/${this.id}:batchUpdate`, body);
        return response;
    }
    /**
     * Sets the cell values
     */
    async batchUpdate(updateData, valueInputMode) {
        const body = {
            data: updateData,
            valueInputOption: valueInputMode,
        };
        const response = await apiRequest.call(this.executeFunctions, 'POST', `/v4/spreadsheets/${this.id}/values:batchUpdate`, body);
        return response;
    }
    async appendEmptyRowsOrColumns(sheetId, rowsToAdd = 1, columnsToAdd = 1) {
        const requests = [];
        if (rowsToAdd > 0) {
            requests.push({
                appendDimension: {
                    sheetId,
                    dimension: 'ROWS',
                    length: rowsToAdd,
                },
            });
        }
        if (columnsToAdd > 0) {
            requests.push({
                appendDimension: {
                    sheetId,
                    dimension: 'COLUMNS',
                    length: columnsToAdd,
                },
            });
        }
        if (requests.length === 0) {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'Must specify at least one column or row to add', { level: 'warning' });
        }
        const response = await apiRequest.call(this.executeFunctions, 'POST', `/v4/spreadsheets/${this.id}:batchUpdate`, { requests });
        return response;
    }
    /**
     * Appends the cell values
     */
    async appendData(range, data, valueInputMode, lastRow, useAppend) {
        const lastRowWithData = lastRow ||
            ((await this.getData(range, 'UNFORMATTED_VALUE')) || []).length + 1;
        const response = await this.updateRows(range, data, valueInputMode, lastRowWithData, data.length, useAppend);
        return response;
    }
    async updateRows(sheetName, data, valueInputMode, row, rowsLength, useAppend) {
        const [name, _sheetRange] = sheetName.split('!');
        const range = `${name}!${row}:${rowsLength ? row + rowsLength - 1 : row}`;
        const body = {
            range,
            values: data,
        };
        const query = {
            valueInputOption: valueInputMode,
        };
        let response;
        if (useAppend) {
            response = await apiRequest.call(this.executeFunctions, 'POST', `/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}:append`, body, query);
        }
        else {
            response = await apiRequest.call(this.executeFunctions, 'PUT', `/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}`, body, query);
        }
        return response;
    }
    /**
     * Returns the given sheet data in a structured way
     */
    convertSheetDataArrayToObjectArray(sheet, startRow, columnKeys, addEmpty, includeHeadersWithEmptyCells) {
        const returnData = [];
        for (let rowIndex = startRow; rowIndex < sheet.length; rowIndex++) {
            const item = {};
            const rowCount = sheet[rowIndex].length;
            const columnCount = includeHeadersWithEmptyCells ? columnKeys.length : rowCount;
            for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
                const key = columnKeys[columnIndex];
                if (key) {
                    item[key] = sheet[rowIndex][columnIndex] ?? '';
                }
            }
            if (Object.keys(item).length || addEmpty === true) {
                returnData.push(item);
            }
        }
        return returnData;
    }
    /**
     * Returns the given sheet data in a structured way using
     * the startRow as the one with the name of the key
     */
    structureArrayDataByColumn(inputData, keyRow, dataStartRow, includeHeadersWithEmptyCells) {
        const keys = [];
        if (keyRow < 0 || dataStartRow < keyRow || keyRow >= inputData.length) {
            // The key row does not exist so it is not possible to structure data
            return [];
        }
        const longestRow = inputData.reduce((a, b) => (a.length > b.length ? a : b), []).length;
        for (let columnIndex = 0; columnIndex < longestRow; columnIndex++) {
            keys.push(inputData[keyRow][columnIndex] || `col_${columnIndex}`);
        }
        return this.convertSheetDataArrayToObjectArray(inputData, dataStartRow, keys, false, includeHeadersWithEmptyCells);
    }
    testFilter(inputData, keyRow, dataStartRow) {
        const keys = [];
        //const returnData = [];
        if (keyRow < 0 || dataStartRow < keyRow || keyRow >= inputData.length) {
            // The key row does not exist so it is not possible to structure data
            return [];
        }
        // Create the keys array
        for (let columnIndex = 0; columnIndex < inputData[keyRow].length; columnIndex++) {
            keys.push(inputData[keyRow][columnIndex]);
        }
        return keys;
    }
    async appendSheetData({ inputData, range, keyRowIndex, valueInputMode, usePathForKeyRow, columnNamesList, lastRow, useAppend, }) {
        const data = await this.convertObjectArrayToSheetDataArray(inputData, range, keyRowIndex, usePathForKeyRow, columnNamesList, useAppend ? null : '');
        return await this.appendData(range, data, valueInputMode, lastRow, useAppend);
    }
    getColumnWithOffset(startColumn, offset) {
        const columnIndex = xlsxUtils.decode_col(startColumn) + offset;
        return xlsxUtils.encode_col(columnIndex);
    }
    async getColumnValues({ range, keyIndex, dataStartRowIndex, valueRenderMode, sheetData, }) {
        let columnValuesList;
        if (sheetData) {
            columnValuesList = sheetData.slice(dataStartRowIndex - 1).map((row) => row[keyIndex]);
        }
        else {
            const decodedRange = this.getDecodedSheetRange(range);
            const startRowIndex = decodedRange.start?.row || dataStartRowIndex;
            const endRowIndex = decodedRange.end?.row || '';
            const keyColumn = this.getColumnWithOffset(decodedRange.start?.column || 'A', keyIndex);
            const keyColumnRange = `${decodedRange.name}!${keyColumn}${startRowIndex}:${keyColumn}${endRowIndex}`;
            columnValuesList = await this.getData(keyColumnRange, valueRenderMode);
        }
        if (columnValuesList === undefined) {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'Could not retrieve the data from key column');
        }
        //Remove the first row which contains the key and flaten the array
        return columnValuesList.splice(1).flatMap((value) => value);
    }
    /**
     * Updates data in a sheet
     *
     * @param {IDataObject[]} inputData Data to update Sheet with
     * @param {string} indexKey The name of the key which gets used to know which rows to update
     * @param {string} range The range to look for data
     * @param {number} keyRowIndex Index of the row which contains the keys
     * @param {number} dataStartRowIndex Index of the first row which contains data
     * @returns {Promise<string[][]>}
     * @memberof GoogleSheet
     */
    async prepareDataForUpdateOrUpsert({ inputData, indexKey, range, keyRowIndex, dataStartRowIndex, valueRenderMode, upsert = false, columnNamesList, columnValuesList, }) {
        const decodedRange = this.getDecodedSheetRange(range);
        const keyRowRange = `${decodedRange.name}!${decodedRange.start?.column || ''}${keyRowIndex + 1}:${decodedRange.end?.column || ''}${keyRowIndex + 1}`;
        const sheetDatakeyRow = columnNamesList || (await this.getData(keyRowRange, valueRenderMode));
        if (sheetDatakeyRow === undefined) {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'Could not retrieve the key row');
        }
        const columnNames = sheetDatakeyRow[0];
        const keyIndex = columnNames.indexOf(indexKey);
        if (keyIndex === -1 && !upsert) {
            throw new NodeOperationError(this.executeFunctions.getNode(), `Could not find column for key "${indexKey}"`);
        }
        const columnValues = columnValuesList ||
            (await this.getColumnValues({ range, keyIndex, dataStartRowIndex, valueRenderMode }));
        const updateData = [];
        const appendData = [];
        const getKeyIndex = (key, data) => {
            let index = -1;
            for (let i = 0; i < data.length; i++) {
                if (data[i]?.toString() === key.toString()) {
                    index = i;
                    break;
                }
            }
            return index;
        };
        for (const item of inputData) {
            const inputIndexKey = item[indexKey];
            if (inputIndexKey === undefined || inputIndexKey === null) {
                // Item does not have the indexKey so we can ignore it or append it if upsert true
                if (upsert) {
                    appendData.push(item);
                }
                continue;
            }
            // Item does have the key so check if it exists in Sheet
            const indexOfIndexKeyInSheet = getKeyIndex(inputIndexKey, columnValues);
            if (indexOfIndexKeyInSheet === -1) {
                // Key does not exist in the Sheet so it can not be updated so skip it or append it if upsert true
                if (upsert) {
                    appendData.push(item);
                }
                continue;
            }
            // Get the row index in which the data should be updated
            const updateRowIndex = indexOfIndexKeyInSheet + dataStartRowIndex + 1;
            // Check all the properties in the sheet and check which ones exist on the
            // item and should be updated
            for (const name of columnNames) {
                if (name === indexKey) {
                    // Ignore the key itself as that does not get changed it gets
                    // only used to find the correct row to update
                    continue;
                }
                if (item[name] === undefined || item[name] === null) {
                    // Property does not exist so skip it
                    continue;
                }
                // Property exists so add it to the data to update
                // Get the column name in which the property data can be found
                const columnToUpdate = this.getColumnWithOffset(decodedRange.start?.column || 'A', columnNames.indexOf(name));
                let updateValue = item[name];
                if (typeof updateValue === 'object') {
                    try {
                        updateValue = JSON.stringify(updateValue);
                    }
                    catch (error) { }
                }
                updateData.push({
                    range: `${decodedRange.name}!${columnToUpdate}${updateRowIndex}`,
                    values: [[updateValue]],
                });
            }
        }
        return { updateData, appendData };
    }
    /**
     * Updates data in a sheet
     *
     * @param {IDataObject[]} inputData Data to update Sheet with
     * @param {string} range The range to look for data
     * @param {number} dataStartRowIndex Index of the first row which contains data
     * @param {string[][]} columnNamesList The column names to use
     * @returns {Promise<string[][]>}
     * @memberof GoogleSheet
     */
    prepareDataForUpdatingByRowNumber(inputData, range, columnNamesList) {
        const decodedRange = this.getDecodedSheetRange(range);
        const columnNames = columnNamesList[0];
        const updateData = [];
        for (const item of inputData) {
            const updateRowIndex = item.row_number;
            for (const name of columnNames) {
                if (name === 'row_number')
                    continue;
                if (item[name] === undefined || item[name] === null)
                    continue;
                const columnToUpdate = this.getColumnWithOffset(decodedRange.start?.column || 'A', columnNames.indexOf(name));
                let updateValue = item[name];
                if (typeof updateValue === 'object') {
                    try {
                        updateValue = JSON.stringify(updateValue);
                    }
                    catch (error) { }
                }
                updateData.push({
                    range: `${decodedRange.name}!${columnToUpdate}${updateRowIndex}`,
                    values: [[updateValue]],
                });
            }
        }
        return { updateData };
    }
    /**
     * Looks for a specific value in a column and if it gets found it returns the whole row
     *
     * @param {string[][]} inputData Data to check for lookup value in
     * @param {number} keyRowIndex Index of the row which contains the keys
     * @param {number} dataStartRowIndex Index of the first row which contains data
     * @param {ILookupValues[]} lookupValues The lookup values which decide what data to return
     * @param {boolean} [returnAllMatches] Returns all the found matches instead of only the first one
     * @returns {Promise<IDataObject[]>}
     * @memberof GoogleSheet
     */
    async lookupValues({ inputData, keyRowIndex, dataStartRowIndex, lookupValues, returnAllMatches, nodeVersion, combineFilters = 'OR', }) {
        const keys = [];
        if (keyRowIndex < 0 || dataStartRowIndex < keyRowIndex || keyRowIndex >= inputData.length) {
            // The key row does not exist so it is not possible to look up the data
            throw new NodeOperationError(this.executeFunctions.getNode(), 'The key row does not exist');
        }
        // Create the keys array
        for (let columnIndex = 0; columnIndex < inputData[keyRowIndex].length; columnIndex++) {
            keys.push(inputData[keyRowIndex][columnIndex] || `col_${columnIndex}`);
        }
        // Standardize values array, if rows is [[]], map it to [['']] (Keep the columns into consideration)
        for (let rowIndex = 0; rowIndex < inputData?.length; rowIndex++) {
            if (inputData[rowIndex].length === 0) {
                for (let i = 0; i < keys.length; i++) {
                    inputData[rowIndex][i] = '';
                }
            }
            else if (inputData[rowIndex].length < keys.length) {
                for (let i = 0; i < keys.length; i++) {
                    if (inputData[rowIndex][i] === undefined) {
                        inputData[rowIndex].push('');
                    }
                }
            }
        }
        // Loop over all the lookup values and try to find a row to return
        let rowIndex;
        let returnColumnIndex;
        const addedRows = [];
        // const returnData = [inputData[keyRowIndex]];
        const returnData = [keys];
        if (combineFilters === 'OR') {
            lookupLoop: for (const lookupValue of lookupValues) {
                returnColumnIndex = keys.indexOf(lookupValue.lookupColumn);
                if (returnColumnIndex === -1) {
                    throw new NodeOperationError(this.executeFunctions.getNode(), `The column "${lookupValue.lookupColumn}" could not be found`);
                }
                // Loop over all the items and find the one with the matching value
                for (rowIndex = dataStartRowIndex; rowIndex < inputData.length; rowIndex++) {
                    if (inputData[rowIndex][returnColumnIndex]?.toString() ===
                        lookupValue.lookupValue?.toString()) {
                        if (addedRows.indexOf(rowIndex) === -1) {
                            returnData.push(inputData[rowIndex]);
                            addedRows.push(rowIndex);
                        }
                        if (returnAllMatches !== true) {
                            if (nodeVersion >= 4.6) {
                                break lookupLoop;
                            }
                            continue lookupLoop;
                        }
                    }
                }
            }
        }
        else {
            lookupLoop: for (rowIndex = dataStartRowIndex; rowIndex < inputData.length; rowIndex++) {
                let allMatch = true;
                for (const lookupValue of lookupValues) {
                    returnColumnIndex = keys.indexOf(lookupValue.lookupColumn);
                    if (returnColumnIndex === -1) {
                        throw new NodeOperationError(this.executeFunctions.getNode(), `The column "${lookupValue.lookupColumn}" could not be found`);
                    }
                    if (inputData[rowIndex][returnColumnIndex]?.toString() !==
                        lookupValue.lookupValue?.toString()) {
                        allMatch = false;
                        break;
                    }
                }
                if (allMatch) {
                    if (addedRows.indexOf(rowIndex) === -1) {
                        returnData.push(inputData[rowIndex]);
                        addedRows.push(rowIndex);
                    }
                    if (returnAllMatches !== true) {
                        break lookupLoop;
                    }
                }
            }
        }
        const dataWithoutEmptyColumns = removeEmptyColumns(returnData);
        return this.convertSheetDataArrayToObjectArray(dataWithoutEmptyColumns, 1, dataWithoutEmptyColumns[0], true);
    }
    async convertObjectArrayToSheetDataArray(inputData, range, keyRowIndex, usePathForKeyRow, columnNamesList, emptyValue = '') {
        const decodedRange = this.getDecodedSheetRange(range);
        const columnNamesRow = columnNamesList ||
            (this.columnNamesHint !== undefined ? [this.columnNamesHint] : undefined) ||
            (await this.getData(`${decodedRange.name}!${keyRowIndex}:${keyRowIndex}`, 'UNFORMATTED_VALUE'));
        this.columnNamesHint = undefined;
        if (columnNamesRow === undefined) {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'Could not retrieve the column data');
        }
        const columnNames = columnNamesRow ? columnNamesRow[0] : [];
        const setData = [];
        inputData.forEach((item) => {
            const rowData = [];
            columnNames.forEach((key) => {
                let value;
                if (usePathForKeyRow) {
                    value = get(item, key);
                }
                else {
                    value = item[key];
                }
                if (value === undefined || value === null) {
                    rowData.push(emptyValue);
                    return;
                }
                if (typeof value === 'object') {
                    rowData.push(JSON.stringify(value));
                }
                else {
                    rowData.push(value);
                }
            });
            setData.push(rowData);
        });
        return setData;
    }
    getDecodedSheetRange(stringToDecode) {
        const decodedRange = {};
        const [name, range] = stringToDecode.split('!');
        decodedRange.nameWithRange = stringToDecode;
        decodedRange.name = name;
        decodedRange.range = range || '';
        decodedRange.start = {};
        decodedRange.end = {};
        if (range) {
            const [startCell, endCell] = range.split(':');
            if (startCell) {
                decodedRange.start = this.splitCellRange(startCell, range);
            }
            if (endCell) {
                decodedRange.end = this.splitCellRange(endCell, range);
            }
        }
        return decodedRange;
    }
    splitCellRange(cell, range) {
        const cellData = cell.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
        if (cellData === null || cellData.length !== 3) {
            throw new NodeOperationError(this.executeFunctions.getNode(), `The range "${range}" is not valid`);
        }
        return { cell: cellData[0], column: cellData[1], row: +cellData[2] };
    }
}
//# sourceMappingURL=GoogleSheet.js.map