import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { GoogleSheet, ROW_NUMBER, ValueInputOption } from '../../../helper';

export async function append(
	this: IExecuteFunctions,
	index: number, //index of what?
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const dataToSend = this.getNodeParameter('dataToSend', 0) as string;

	if (!items.length || dataToSend === 'nothing') return [];

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	const keyRow = parseInt(options.headerRow as string, 10) || 1;
	const cellFormat = (options.cellFormat || 'RAW') as ValueInputOption;

	let columnNames: string[] = [];
	let handlingExtraData = '';
	if (dataToSend === 'autoMapInputData') {
		handlingExtraData = this.getNodeParameter('handlingExtraData', 0) as string;

		const response = await sheet.getData(`${encodeURIComponent(sheetName)}!1:1`, 'FORMATTED_VALUE');
		columnNames = response ? response[0] : [];

		if (!columnNames.length) {
			await sheet.appendData(
				encodeURIComponent(sheetName),
				[Object.keys(items[0].json)],
				cellFormat,
			);
			columnNames = Object.keys(items[0].json);
		}
	}

	const setData: IDataObject[] = [];

	if (dataToSend === 'autoMapInputData') {
		if (handlingExtraData === 'insertInNewColumn') {
			const newColumns: string[] = [];
			items.forEach((item) => {
				Object.keys(item.json).forEach((key) => {
					if (key !== ROW_NUMBER && columnNames.includes(key) === false) {
						newColumns.push(key);
					}
				});
				setData.push(item.json);
			});
			if (newColumns.length) {
				await sheet.updateRow(
					encodeURIComponent(sheetName),
					[columnNames.concat(newColumns)],
					cellFormat,
					1,
				);
			}
		}
		if (handlingExtraData === 'ignoreIt') {
			items.forEach((item) => {
				setData.push(item.json);
			});
		}
		if (handlingExtraData === 'error') {
			items.forEach((item, itemIndex) => {
				Object.keys(item.json).forEach((key) => {
					if (columnNames.includes(key) === false) {
						throw new NodeOperationError(this.getNode(), `Unexpected fields in node input`, {
							itemIndex,
							description: `The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field`,
						});
					}
				});
				setData.push(item.json);
			});
		}
	} else {
		for (let i = 0; i < items.length; i++) {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as IDataObject[];
			let dataToSend: IDataObject = {};
			for (const field of fields) {
				dataToSend = { ...dataToSend, [field.fieldId as string]: field.fieldValue };
			}
			setData.push(dataToSend);
		}
	}

	const data = await sheet.appendSheetData(setData, sheetName, keyRow, cellFormat, false);

	return items;
}
