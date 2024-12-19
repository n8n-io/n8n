import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { wrapData } from '../../../../../../utils/utilities';
import { GOOGLE_DRIVE_FILE_URL_REGEX } from '../../../../constants';
import type { SpreadSheetProperties } from '../../helpers/GoogleSheets.types';
import { apiRequest } from '../../transport';

export const description: SpreadSheetProperties = [
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
					regex: GOOGLE_DRIVE_FILE_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FILE_URL_REGEX,
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
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
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

		const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
			itemData: { item: i },
		});

		returnData.push(...executionData);
	}

	return returnData;
}
