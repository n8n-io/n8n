import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SpreadSheetProperties } from '../../helpers/GoogleSheets.types';
import { apiRequest } from '../../transport';

export const description: SpreadSheetProperties = [
	{
		displayName: 'Spreadsheet ID',
		name: 'spreadsheetId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['spreadsheet'],
				operation: ['deleteSpreadsheet'],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const spreadsheetId = this.getNodeParameter('spreadsheetId', i) as string;

		await apiRequest.call(
			this,
			'DELETE',
			'',
			{},
			{},
			`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`,
		);

		returnData.push({ success: true });
	}

	return this.helpers.returnJsonArray(returnData);
}
