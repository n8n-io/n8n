import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { wrapData } from '../../../../../../utils/utilities';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import { apiRequest } from '../../transport';

export async function execute(
	this: IExecuteFunctions,
	_sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	for (let i = 0; i < items.length; i++) {
		const [spreadsheetId, sheetWithinDocument] = sheetName.split('||');
		const requests = [
			{
				deleteSheet: {
					sheetId: sheetWithinDocument,
				},
			},
		];

		const responseData = await apiRequest.call(
			this,
			'POST',
			`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
			{ requests },
		);
		delete responseData.replies;

		const executionData = this.helpers.constructExecutionMetaData(
			wrapData(responseData as IDataObject[]),
			{ itemData: { item: i } },
		);

		returnData.push(...executionData);
	}

	return returnData;
}
