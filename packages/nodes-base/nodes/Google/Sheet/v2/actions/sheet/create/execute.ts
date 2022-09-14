import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { apiRequest } from '../../../transport';
import { GoogleSheet } from '../../../helper/GoogleSheet';
import { hexToRgb } from '../../../helper/GoogleSheets.utils';

export async function create(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	let responseData;
	const returnData: IDataObject[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const sheetTitle = this.getNodeParameter('title', i, {}) as string;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const simple = this.getNodeParameter('simple', i) as boolean;
		const properties = { ...options };
		properties.title = sheetTitle;

		if (options.tabColor) {
			const { red, green, blue } = hexToRgb(options.tabColor as string)!;
			properties.tabColor = { red: red / 255, green: green / 255, blue: blue / 255 };
		}

		const requests = [
			{
				addSheet: {
					properties,
				},
			},
		];
		responseData = await apiRequest.call(
			this,
			'POST',
			`/v4/spreadsheets/${sheetName}:batchUpdate`,
			{ requests },
		);

		if (simple === true) {
			Object.assign(responseData, responseData.replies[0].addSheet.properties);
			delete responseData.replies;
		}
		returnData.push(responseData);
	}
	return this.helpers.returnJsonArray(returnData);
}
