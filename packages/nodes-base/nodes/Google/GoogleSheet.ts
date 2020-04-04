import { IDataObject } from 'n8n-workflow';
import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { getAuthenticationClient } from './GoogleApi';

import {
	utils as xlsxUtils,
} from 'xlsx';

const Sheets = google.sheets('v4'); // tslint:disable-line:variable-name

export interface ISheetOptions {
	scope: string[];
}

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

export interface ISheetUpdateData {
	range: string;
	values: string[][];
}

export interface ILookupValues {
	lookupColumn: string;
	lookupValue: string;
}

export interface IToDeleteRange {
	amount: number;
	startIndex: number;
	sheetId: number;
}

export interface IToDelete {
	[key: string]: IToDeleteRange[] | undefined;
	columns?: IToDeleteRange[];
	rows?: IToDeleteRange[];
}

export type ValueInputOption = 'RAW' | 'USER_ENTERED';

export type ValueRenderOption = 'FORMATTED_VALUE' | 'FORMULA' | 'UNFORMATTED_VALUE';

export class GoogleSheet {
	id: string;
	credentials: IGoogleAuthCredentials;
	scopes: string[];

	constructor(spreadsheetId: string, credentials: IGoogleAuthCredentials, options?: ISheetOptions | undefined) {
		// options = <SheetOptions>options || {};
		if (!options) {
			options = {} as ISheetOptions;
		}

		this.id = spreadsheetId;
		this.credentials = credentials;
		this.scopes = options.scope || ['https://www.googleapis.com/auth/spreadsheets'];
	}


	/**
	 * Clears values from a sheet
	 *
	 * @param {string} range
	 * @returns {Promise<object>}
	 * @memberof GoogleSheet
	 */
	async clearData(range: string): Promise<object> {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.values.clear(
			{
				auth: client,
				spreadsheetId: this.id,
				range,
			}
		);

		return response.data;
	}

    /**
     * Returns the cell values
     */
	async getData(range: string, valueRenderMode: ValueRenderOption): Promise<string[][] | undefined> {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.values.get(
			{
				auth: client,
				spreadsheetId: this.id,
				range,
				valueRenderOption: valueRenderMode,
			}
		);

		return response.data.values as string[][] | undefined;
	}


	/**
	 * Returns the sheets in a Spreadsheet
	 */
	async spreadsheetGetSheets() {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.get(
			{
				auth: client,
				spreadsheetId: this.id,
				fields: 'sheets.properties'
			}
		);

		return response.data;
	}


	/**
	 * Sets values in one or more ranges of a spreadsheet.
	 */
	async spreadsheetBatchUpdate(requests: sheets_v4.Schema$Request[]) { // tslint:disable-line:no-any
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.batchUpdate(
			{
				auth: client,
				spreadsheetId: this.id,
				requestBody: {
					requests,
				},
			}
		);

		return response.data;
	}


    /**
     * Sets the cell values
     */
	async batchUpdate(updateData: ISheetUpdateData[], valueInputMode: ValueInputOption) {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.values.batchUpdate(
			{
				auth: client,
				spreadsheetId: this.id,
				valueInputOption: valueInputMode,
				resource: {
					data: updateData,
				},
			}
		);

		return response.data;
	}


    /**
     * Sets the cell values
     */
	async setData(range: string, data: string[][], valueInputMode: ValueInputOption) {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.values.update(
			{
				// @ts-ignore
				auth: client,
				spreadsheetId: this.id,
				range,
				valueInputOption: valueInputMode,
				resource: {
					values: data
				}
			}
		);

		return response.data;
	}


    /**
     * Appends the cell values
     */
	async appendData(range: string, data: string[][], valueInputMode: ValueInputOption) {
		const client = await this.getAuthenticationClient();

		// @ts-ignore
		const response = await Sheets.spreadsheets.values.append(
			{
				auth: client,
				spreadsheetId: this.id,
				range,
				valueInputOption: valueInputMode,
				resource: {
					values: data
				}
			}
		);

		return response.data;
	}


    /**
     * Returns the authentication client needed to access spreadsheet
     */
	async getAuthenticationClient(): Promise<JWT> {
		return getAuthenticationClient(this.credentials.email, this.credentials.privateKey, this.scopes);
	}


    /**
     * Returns the given sheet data in a strucutred way
     */
	structureData(inputData: string[][], startRow: number, keys: string[], addEmpty?: boolean): IDataObject[] {
		const returnData = [];

		let tempEntry: IDataObject, rowIndex: number, columnIndex: number, key: string;

		for (rowIndex = startRow; rowIndex < inputData.length; rowIndex++) {
			tempEntry = {};
			for (columnIndex = 0; columnIndex < inputData[rowIndex].length; columnIndex++) {
				key = keys[columnIndex];
				if (key) {
					// Only add the data for which a key was given and ignore all others
					tempEntry[key] = inputData[rowIndex][columnIndex];
				}
			}
			if (Object.keys(tempEntry).length || addEmpty === true) {
				// Only add the entry if data got found to not have empty ones
				returnData.push(tempEntry);
			}
		}

		return returnData;
	}


    /**
     * Returns the given sheet data in a strucutred way using
     * the startRow as the one with the name of the key
     */
	structureArrayDataByColumn(inputData: string[][], keyRow: number, dataStartRow: number): IDataObject[] {

		const keys: string[] = [];

		if (keyRow < 0 || dataStartRow < keyRow || keyRow >= inputData.length) {
			// The key row does not exist so it is not possible to strucutre data
			return [];
		}

		// Create the keys array
		for (let columnIndex = 0; columnIndex < inputData[keyRow].length; columnIndex++) {
			keys.push(inputData[keyRow][columnIndex]);
		}

		return this.structureData(inputData, dataStartRow, keys);
	}


	async appendSheetData(inputData: IDataObject[], range: string, keyRowIndex: number, valueInputMode: ValueInputOption): Promise<string[][]> {
		const data = await this.convertStructuredDataToArray(inputData, range, keyRowIndex);
		return this.appendData(range, data, valueInputMode);
	}


	getColumnWithOffset (startColumn: string, offset: number): string {
		const columnIndex = xlsxUtils.decode_col(startColumn) + offset;
		return xlsxUtils.encode_col(columnIndex);
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
	async updateSheetData(inputData: IDataObject[], indexKey: string, range: string, keyRowIndex: number, dataStartRowIndex: number, valueInputMode: ValueInputOption, valueRenderMode: ValueRenderOption): Promise<string[][]> {
		// Get current data in Google Sheet
		let rangeStart: string, rangeEnd: string;
		let sheet: string | undefined = undefined;
		if (range.includes('!')) {
			[sheet, range] = range.split('!');
		}
		[rangeStart, rangeEnd] = range.split(':');

		const rangeStartSplit = rangeStart.match(/([a-zA-Z]{1,10})([0-9]{0,10})/);
		const rangeEndSplit = rangeEnd.match(/([a-zA-Z]{1,10})([0-9]{0,10})/);

		if (rangeStartSplit === null || rangeStartSplit.length !== 3 || rangeEndSplit === null || rangeEndSplit.length !== 3) {
			throw new Error(`The range "${range}" is not valid.`);
		}

		const keyRowRange = `${sheet ? sheet + '!' : ''}${rangeStartSplit[1]}${dataStartRowIndex}:${rangeEndSplit[1]}${dataStartRowIndex}`;

		const sheetDatakeyRow = await this.getData(keyRowRange, valueRenderMode);

		if (sheetDatakeyRow === undefined) {
			throw new Error('Could not retrieve the key row!');
		}

		const keyColumnOrder = sheetDatakeyRow[0];

		const keyIndex = keyColumnOrder.indexOf(indexKey);

		if (keyIndex === -1) {
			throw new Error(`Could not find column for key "${indexKey}"!`);
		}

		const startRowIndex = rangeStartSplit[2] || '';
		const endRowIndex = rangeEndSplit[2] || '';

		const keyColumn = this.getColumnWithOffset(rangeStartSplit[1], keyIndex);
		const keyColumnRange = `${sheet ? sheet + '!' : ''}${keyColumn}${startRowIndex}:${keyColumn}${endRowIndex}`;

		const sheetDataKeyColumn = await this.getData(keyColumnRange, valueRenderMode);

		if (sheetDataKeyColumn === undefined) {
			throw new Error('Could not retrieve the key column!');
		}

		// TODO: The data till here can be cached optionally. Maybe add an option which can
		//       can be activated if it is used in a loop and nothing else updates the data.

		// Remove the first row which contains the key
		sheetDataKeyColumn.shift();

		// Create an Array which all the key-values of the Google Sheet
		const keyColumnIndexLookup = sheetDataKeyColumn.map((rowContent) => rowContent[0] );

		const updateData: ISheetUpdateData[] = [];
		let itemKey: string | number | undefined | null;
		let propertyName: string;
		let itemKeyIndex: number;
		let updateRowIndex: number;
		let updateColumnName: string;
		for (const inputItem of inputData) {
			itemKey = inputItem[indexKey] as string;
			// if ([undefined, null].includes(inputItem[indexKey] as string | undefined | null)) {
			if (itemKey === undefined || itemKey === null) {
				// Item does not have the indexKey so we can ignore it
				continue;
			}

			// Item does have the key so check if it exists in Sheet
			itemKeyIndex = keyColumnIndexLookup.indexOf(itemKey as string);
			if (itemKeyIndex === -1) {
				// Key does not exist in the Sheet so it can not be updated so skip it
				continue;
			}

			// Get the row index in which the data should be updated
			updateRowIndex = keyColumnIndexLookup.indexOf(itemKey) + dataStartRowIndex + 1;

			// Check all the properties in the sheet and check which ones exist on the
			// item and should be updated
			for (propertyName of keyColumnOrder) {
				if (propertyName === indexKey) {
					// Ignore the key itself as that does not get changed it gets
					// only used to find the correct row to update
					continue;
				}
				if (inputItem[propertyName] === undefined || inputItem[propertyName] === null) {
					// Property does not exist so skip it
					continue;
				}

				// Property exists so add it to the data to update

				// Get the column name in which the property data can be found
				updateColumnName = this.getColumnWithOffset(rangeStartSplit[1], keyColumnOrder.indexOf(propertyName));

				updateData.push({
					range: `${sheet ? sheet + '!' : ''}${updateColumnName}${updateRowIndex}`,
					values: [
						[
							inputItem[propertyName] as string,
						],
					],
				});

			}
		}

		return this.batchUpdate(updateData, valueInputMode);
	}


	/**
	 * Looks for a specific value in a column and if it gets found it returns the whole row
	 *
	 * @param {string[][]} inputData Data to to check for lookup value in
	 * @param {number} keyRowIndex Index of the row which contains the keys
	 * @param {number} dataStartRowIndex Index of the first row which contains data
	 * @param {ILookupValues[]} lookupValues The lookup values which decide what data to return
	 * @param {boolean} [returnAllMatches] Returns all the found matches instead of only the first one
	 * @returns {Promise<IDataObject[]>}
	 * @memberof GoogleSheet
	 */
	async lookupValues(inputData: string[][], keyRowIndex: number, dataStartRowIndex: number, lookupValues: ILookupValues[], returnAllMatches?: boolean): Promise<IDataObject[]> {
		const keys: string[] = [];

		if (keyRowIndex < 0 || dataStartRowIndex < keyRowIndex || keyRowIndex >= inputData.length) {
			// The key row does not exist so it is not possible to look up the data
			throw new Error(`The key row does not exist!`);
		}

		// Create the keys array
		for (let columnIndex = 0; columnIndex < inputData[keyRowIndex].length; columnIndex++) {
			keys.push(inputData[keyRowIndex][columnIndex]);
		}

		const returnData = [
			inputData[keyRowIndex],
		];

		// Loop over all the lookup values and try to find a row to return
		let rowIndex: number;
		let returnColumnIndex: number;
		lookupLoop:
		for (const lookupValue of lookupValues) {
			returnColumnIndex = keys.indexOf(lookupValue.lookupColumn);

			if (returnColumnIndex === -1) {
				throw new Error(`The column "${lookupValue.lookupColumn}" could not be found!`);
			}

			// Loop over all the items and find the one with the matching value
			for (rowIndex = dataStartRowIndex; rowIndex < inputData.length; rowIndex++) {
				if (inputData[rowIndex][returnColumnIndex]?.toString() === lookupValue.lookupValue.toString()) {
					returnData.push(inputData[rowIndex]);

					if (returnAllMatches !== true) {
						continue lookupLoop;
					}
				}
			}

			// If value could not be found add an empty one that the order of
			// the returned items stays the same
			if (returnAllMatches !== true) {
				returnData.push([]);
			}
		}

		return this.structureData(returnData, 1, keys, true);
	}


	async convertStructuredDataToArray(inputData: IDataObject[], range: string, keyRowIndex: number): Promise<string[][]> {
		let startColumn, endColumn;
		let sheet: string | undefined = undefined;
		if (range.includes('!')) {
			[sheet, range] = range.split('!');
		}
		[startColumn, endColumn] = range.split(':');


		let getRange = `${startColumn}${keyRowIndex + 1}:${endColumn}${keyRowIndex + 1}`;

		if (sheet !== undefined) {
			getRange = `${sheet}!${getRange}`;
		}

		const keyColumnData = await this.getData(getRange, 'UNFORMATTED_VALUE');

		if (keyColumnData === undefined) {
			throw new Error('Could not retrieve the column data!');
		}

		const keyColumnOrder = keyColumnData[0];

		const setData: string[][] = [];

		let rowData: string[] = [];
		inputData.forEach((item) => {
			rowData = [];
			keyColumnOrder.forEach((key) => {
				if (item.hasOwnProperty(key) && item[key]) {
					rowData.push(item[key]!.toString());
				} else {
					rowData.push('');
				}
			});

			setData.push(rowData);
		});

		return setData;
	}

}
