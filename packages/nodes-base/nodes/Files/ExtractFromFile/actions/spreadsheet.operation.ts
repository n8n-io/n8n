import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import * as fromFile from '../../../SpreadsheetFile/v2/fromFile.operation';

export const operations = ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'];

export const description: INodeProperties[] = fromFile.description
	.filter((property) => property.name !== 'fileFormat')
	.map((property) => {
		const newProperty = { ...property };
		newProperty.displayOptions = {
			show: {
				operation: operations,
			},
		};

		if (newProperty.name === 'options') {
			newProperty.options = (newProperty.options as INodeProperties[]).map((option) => {
				let newOption = option;
				if (
					['delimiter', 'encoding', 'fromLine', 'maxRowCount', 'enableBOM', 'relaxQuotes'].includes(
						option.name,
					)
				) {
					newOption = { ...option, displayOptions: { show: { '/operation': ['csv'] } } };
				}
				if (option.name === 'sheetName') {
					newOption = {
						...option,
						displayOptions: { show: { '/operation': ['ods', 'xls', 'xlsx'] } },
						description: 'Name of the sheet to read from in the spreadsheet',
					};
				}
				if (option.name === 'range') {
					newOption = {
						...option,
						displayOptions: { show: { '/operation': ['ods', 'xls', 'xlsx'] } },
					};
				}
				if (['includeEmptyCells', 'headerRow'].includes(option.name)) {
					newOption = {
						...option,
						displayOptions: { show: { '/operation': ['ods', 'xls', 'xlsx', 'csv', 'html'] } },
					};
				}
				return newOption;
			});
		}
		return newProperty;
	});

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	fileFormatProperty: string,
) {
	const returnData: INodeExecutionData[] = await fromFile.execute.call(
		this,
		items,
		fileFormatProperty,
	);
	return returnData;
}
