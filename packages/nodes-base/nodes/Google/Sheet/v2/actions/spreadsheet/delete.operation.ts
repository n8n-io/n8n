import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SpreadSheetProperties } from '../../helpers/GoogleSheets.types';
import { apiRequest } from '../../transport';

export const description: SpreadSheetProperties = [
	// {
	// 	displayName: 'Spreadsheet ID',
	// 	name: 'spreadsheetId',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: ['spreadsheet'],
	// 			operation: ['deleteSpreadsheet'],
	// 		},
	// 	},
	// },
	{
		displayName: 'Document',
		name: 'documentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'spreadSheetsSearch',
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				extractValue: {
					type: 'regex',
					regex:
						'https:\\/\\/(?:drive|docs)\\.google\\.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'https:\\/\\/(?:drive|docs)\\.google.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
							errorMessage: 'Not a valid Google Drive File URL',
						},
					},
				],
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive File ID',
						},
					},
				],
				url: '=https://docs.google.com/spreadsheets/d/{{$value}}/edit',
			},
		],
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
		// const spreadsheetId = this.getNodeParameter('spreadsheetId', i) as string;
		const documentId = this.getNodeParameter('documentId', i, undefined, {
			extractValue: true,
		}) as string;

		await apiRequest.call(
			this,
			'DELETE',
			'',
			{},
			{},
			`https://www.googleapis.com/drive/v3/files/${documentId}`,
		);

		returnData.push({ success: true });
	}

	return this.helpers.returnJsonArray(returnData);
}
