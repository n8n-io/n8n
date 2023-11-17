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
				if (['delimiter', 'fromLine', 'maxRowCount', 'enableBOM'].includes(option.name)) {
					newOption = { ...option, displayOptions: { show: { '/operation': ['csv'] } } };
				}
				return newOption;
			});
		}
		return newProperty;
	});

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	operation: string,
) {
	const returnData: INodeExecutionData[] = await fromFile.execute.call(this, items, operation);
	return returnData;
}
