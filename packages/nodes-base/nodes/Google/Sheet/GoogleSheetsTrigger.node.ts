import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

import {
	GoogleSheet,
} from './GoogleSheet';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

export class GoogleSheetsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets Trigger',
		name: 'googleSheetsTrigger',
		icon: 'file:googlesheets.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{($parameter["event"])}}',
		description: 'Starts the workflow when Google Sheets events occur.',
		defaults: {
			name: 'Google Sheets Trigger',
			color: '#0aa55c',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'googleSheetsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Row Added',
						value: 'rowAdded',
					},
				],
				default: 'rowAdded',
				required: true,
			},
			{
				displayName: 'Spreadsheet ID',
				name: 'spreadsheetId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSpreadsheets',
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Worksheet ID',
				name: 'worksheetId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorksheets',
					loadOptionsDependsOn: [
						'spreadsheetId',
					],
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				default: 'A:F',
				required: true,
				description: 'The table range to read from.',
			},
			{
				displayName: 'Key Row',
				name: 'keyRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Index of the row which contains the keys. Starts at 1.<br />The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
			{
				displayName: 'Start Index',
				name: 'startIndex',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				required: true,
				description: 'Index where to start looking for new data',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Value Render Option',
						name: 'valueRenderOption',
						type: 'options',
						options: [
							{
								name: 'Formatted Value',
								value: 'FORMATTED_VALUE',
								description: 'Values will be calculated & formatted in the reply according to the cell\'s formatting.Formatting is based on the spreadsheet\'s locale, not the requesting user\'s locale.For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23".',
							},
							{
								name: 'Formula',
								value: 'FORMULA',
								description: '	Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1".',
							},
							{
								name: 'Unformatted Value',
								value: 'UNFORMATTED_VALUE',
								description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.',
							},
						],
						default: 'UNFORMATTED_VALUE',
						description: 'Determines how values should be rendered in the output.',
					},
					{
						displayName: 'DateTime Render Option',
						name: 'dateTimeRenderOption',
						type: 'options',
						options: [
							{
								name: 'Serial Number',
								value: 'SERIAL_NUMBER',
								description: `Instructs date, time, datetime, and duration fields to be output as doubles in "serial number" format,<br>
								as popularized by Lotus 1-2-3. The whole number portion of the value (left of the decimal) counts the days since December 30th 1899.<br>
								The fractional portion (right of the decimal) counts the time as a fraction of the day. For example, January 1st 1900 at noon would be 2.5,<br>
								2 because it's 2 days after December 30st 1899, and .5 because noon is half a day. February 1st 1900 at 3pm would be 33.625. This correctly<br>
								treats the year 1900 as not a leap year.`,
							},
							{
								name: 'Formatted String',
								value: 'FORMATTED_STRING',
								description: `Instructs date, time, datetime, and duration fields to be output as strings in their given number format (which is dependent on the spreadsheet locale).`,
							},
						],
						default: 'SERIAL_NUMBER',
						description: 'Determines how dates should be rendered in the output.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the worksheets in a Spreadsheet
			async getWorksheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spreadsheetId = this.getCurrentNodeParameter('spreadsheetId') as string;

				const sheet = new GoogleSheet(spreadsheetId, this);
				const responseData = await sheet.spreadsheetGetSheets();

				if (responseData === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const sheet of responseData.sheets!) {
					if (sheet.properties!.sheetType !== 'GRID') {
						continue;
					}

					returnData.push({
						name: sheet.properties!.title as string,
						value: sheet.properties!.title as unknown as string,
					});
				}
				return returnData;
			},
			// Get all the  in a spreadsheets
			async getSpreadsheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {				
				const files = await googleApiRequestAllItems.call(this, 'files', 'GET', '', {}, { q: `mimeType="application/vnd.google-apps.spreadsheet"` }, 'https://www.googleapis.com/drive/v3/files');
				
				const returnData: INodePropertyOptions[] = [];
				for (const file of files!) {
					returnData.push({
						name: file.name as string,
						value: file.id as unknown as string,
					});
				}
				return returnData;
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const spreadsheetId = this.getNodeParameter('spreadsheetId') as string;
		const worksheetId = this.getNodeParameter('worksheetId') as string;
		const range = this.getNodeParameter('range') as string;
		const startIndex = this.getNodeParameter('startIndex') as number;
		const keyRow = this.getNodeParameter('keyRow') as number;
		const options = this.getNodeParameter('options') as IDataObject;
		const qs: IDataObject = {};

		Object.assign(qs, options);

		const ranges = [];

		const [rangeFrom, rangeTo] = range.split(':');

		const keyRange = `${rangeFrom}${keyRow}:${rangeTo}${keyRow}`;

		let { values: columns } = await googleApiRequest.call(this, 'GET', `/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}!${keyRange}`);

		columns = columns[0];
		
		if (webhookData.lastIndexChecked === undefined) {
			ranges.push(`${rangeFrom}${startIndex}:${rangeTo}`);
			webhookData.lastIndexChecked = startIndex;
		} else {
			ranges.push(`${rangeFrom}${webhookData.lastIndexChecked}:${rangeTo}`);
		}
		const  { values } = await googleApiRequest.call(this, 'GET', `/v4/spreadsheets/${spreadsheetId}/values/${worksheetId}!${ranges[0]}`, {}, qs);

		const results: IDataObject[] = [];

		if (Array.isArray(values)) {
			for (let i = 0; i < values.length; i++) {
				const column: IDataObject = {};
				for (let y = 0; y < columns.length; y++) {
					column[columns[y]] = values[i][y] || '';
				}
				results.push(column);
			}

			webhookData.lastIndexChecked = webhookData.lastIndexChecked as number + values.length;
		}

		if (Array.isArray(results) && results.length !== 0) {
			return [this.helpers.returnJsonArray(results)];
		}

		return null;
	}
}
