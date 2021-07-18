import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { IExecuteFunctions } from 'n8n-core';

interface SheetResult {
		result: IDataObject;
}
interface Headers {
		Authorization: string;
		'Content-Type': string;
}
interface SmartSheet {
		sheetId: string;
		headers: Headers;
		baseURI: string;
}
interface DynamicObject {
		[key: string]: DynamicObject;
}
interface Cell {
		columnId: string;
}
interface Row {
		toTop: boolean;
		cells: Cell[];
}

interface Column {
		title: string;
		type: string;
		id: string;
}

interface SheetInfo {
		columns: Column[];
}

interface FormData {
		[key: string]: FormData;
}

interface FormIOData extends IDataObject {
		formData: FormData;
		formInputFields: FormIOFields[];
}

interface FormIO extends INodeExecutionData {
		json: FormIOData;
}
interface FormIOValues {
		value: string;
		label: string;
}
interface FormIOFields {
		key: string;
		value: string | object;
		type: string;
		values: FormIOValues[];
		label: string;
}

export async function createRowinSheet(this: IExecuteFunctions) {
		const client = require('smartsheet');
		const credentials = this.getCredentials('smartSheetApi') as IDataObject;
		const sheetId = this.getNodeParameter('sheetId', 0) as string;
		const API_KEY = credentials.apiKey;
		const smartsheet: SmartSheet = {
				sheetId,
				headers: {
						Authorization: 'Bearer ' + API_KEY,
						'Content-Type': 'application/json',
				},
				baseURI: 'https://api.smartsheet.com/2.0/',
		};
		try {
				const sheetInfo = await getSheet.call(this, smartsheet);
				const row = createRowData(sheetInfo, this.getInputData() as FormIO[]);
				if (row.length > 0) {
						const result: SheetResult = await addRow.call(this, smartsheet, row);
						return result.result;
				}
		} catch (e) {
				throw new Error(e);
		}
		return [];

}

function getSheet(this: IExecuteFunctions, smartsheet: SmartSheet): Promise<SheetInfo> {
		const path = 'sheets/' + smartsheet.sheetId;
		const uri = smartsheet.baseURI + path;
		const options = {
				method: 'GET',
				uri,
				qs: {
						includeAll: true,
						level: 2, // this parameter to get 'MULTI_PICKLIST' coloumn type in the payload.
				},
				headers: smartsheet.headers,
				json: true,
		};
		return new Promise((resolve, reject) => {
				this.helpers.request!(options)
						.then((sheetInfo: SheetInfo) => {
								resolve(sheetInfo);
						})
						.catch((error: unknown) => {
								reject('Could not get sheet. Please check API KEY and Sheet ID');
						});
		});
}

/**
 * Create new row data for smartsheet
 * @param sheetInfo smartsheet details
 */
function createRowData(sheetInfo: SheetInfo, formIOData: FormIO[]) {
		const row: Row[] = [];
		if (!sheetInfo) return row;
		if (sheetInfo.columns && sheetInfo.columns.length > 0 && formIOData[0] && formIOData[0].json) {
				const columns = sheetInfo.columns;
				const formData: FormData = formIOData[0].json.formData; // data from form.io
				const formFieldDetails: FormIOFields[] = formIOData[0].json.formInputFields; // has form.io field types
				const procesedFormData: DynamicObject = processFormIoData(formData, formFieldDetails);
				const cells = addCells(columns, procesedFormData);
				if (cells.length > 0) row.push({ toTop: true, cells });
		}
		return row;
}

/**
 * Method will process data from form.io according to smarsheet format
 * Form.io field label will be considered for mapping
 * @param formData has the details of data entered in the form
 * @param formFieldDetails has the form input details
 */
function processFormIoData(formData: FormData, formFieldDetails: FormIOFields[]) {
		const procesedFormData: DynamicObject = {};
		for (const formField of formFieldDetails) {
				if (formData[formField.key]) {

						// if type is selectboxes then checkbox value label is mapped into smartsheet coloumn
						// smartsheet should have a column with checkbox label name
						// smartsheet does not support multiple checkboxes
						if (formField.type === 'selectboxes') {
								const selectedCheckboxes = formData[formField.key];
								for (const checkbox of formField.values) {
										if (selectedCheckboxes[checkbox.value]) {
												procesedFormData[checkbox.label] = {
														value: selectedCheckboxes[checkbox.value],
												};
										}
								}
						}
						else {
								procesedFormData[formField.label] = {
										value: formData[formField.key],
								};
						}
				}
		}
		return procesedFormData;
}

/**
 * Method will create data for smartsheet
 * Checks coloumn exist on the sheet based on label field in the form.io data
 * @param columns in smartsheet
 * @param processedFormData processed form.io data
 */
function addCells(columns: Column[], processedFormData: DynamicObject) {
		const cells = [];
		for (const column of columns) {
				if (processedFormData[column.title]) {
						const formDetalils = processedFormData[column.title];
						if (column.type === 'MULTI_PICKLIST') {
								cells.push(
										{
												columnId: column.id,
												objectValue: {
														'objectType': 'MULTI_PICKLIST',
														'values': formDetalils.value,
												},
										},
								);
						} else {
								cells.push(
										{
												columnId: column.id,
												value: formDetalils.value,
												strict: false,
										},
								);
						}

				}
		}
		return cells;
}

/**
 * Method will add row into the provided smartsheet
 * @param this 
 * @param smartsheet 
 * @param row consits of row details to be added into smartsheet
 */
function addRow(this: IExecuteFunctions, smartsheet: SmartSheet, row: Row[]): Promise<SheetResult> {
		const path = 'sheets/' + smartsheet.sheetId + '/rows';
		const uri = smartsheet.baseURI + path;
		const options = {
				method: 'POST',
				uri,
				headers: smartsheet.headers,
				json: true,
				body: row,
		};
		return new Promise((resolve, reject) => {
				this.helpers.request!(options)
						.then((result: SheetResult) => {
								resolve(result);
						})
						.catch((error: unknown) => {
								reject('Could not create row in smartsheet');
						});
		});
}