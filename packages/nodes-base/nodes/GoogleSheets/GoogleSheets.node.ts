import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	GoogleSheet,
	IGoogleAuthCredentials,
	ILookupValues,
	ISheetUpdateData,
	ValueInputOption,
	ValueRenderOption,
} from './GoogleSheet';


export class GoogleSheets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets ',
		name: 'googleSheets',
		icon: 'file:googlesheets.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Read, update and write data to Google Sheets',
		defaults: {
			name: 'Google Sheets',
			color: '#995533',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Appends the data to a Sheet',
					},
					{
						name: 'Lookup',
						value: 'lookup',
						description: 'Looks for a specific column value and then returns the matching row'
					},
					{
						name: 'Read',
						value: 'read',
						description: 'Reads data from a Sheet'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Updates rows in a sheet'
					},
				],
				default: 'read',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Sheet ID',
				name: 'sheetId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the Google Sheet.',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				default: 'A:F',
				required: true,
				description: 'The columns to read and append data to.<br />If it contains multiple sheets it can also be<br />added like this: "MySheet!A:F"',
			},

			// ----------------------------------
			//         Read
			// ----------------------------------
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'read'
						],
					},
				},
				default: false,
				description: 'If the data should be returned RAW instead of parsed into keys according to their header.',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: [
							'read'
						],
						rawData: [
							true
						],
					},
				},
				description: 'The name of the property into which to write the RAW data.',
			},

			// ----------------------------------
			//         Update
			// ----------------------------------
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'update'
						],
					},
				},
				default: false,
				description: 'If the data supplied is RAW instead of parsed into keys.',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: [
							'update'
						],
						rawData: [
							true
						],
					},
				},
				description: 'The name of the property from which to read the RAW data.',
			},

			// ----------------------------------
			//         Read & Update & lookupColumn
			// ----------------------------------
			{
				displayName: 'Data Start Row',
				name: 'dataStartRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				displayOptions: {
					hide: {
						operation: [
							'append',
						],
						rawData: [
							true
						],
					},
				},
				description: 'Index of the first row which contains<br />the actual data and not the keys. Starts with 0.',
			},

			// ----------------------------------
			//         Mixed
			// ----------------------------------
			{
				displayName: 'Key Row',
				name: 'keyRow',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					hide: {
						rawData: [
							true
						],
					},
				},
				default: 0,
				description: 'Index of the row which contains the key. Starts with 0.',
			},


			// ----------------------------------
			//         lookup
			// ----------------------------------
			{
				displayName: 'Lookup Column',
				name: 'lookupColumn',
				type: 'string',
				default: '',
				placeholder: 'Email',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'lookup'
						],
					},
				},
				description: 'The name of the column in which to look for value.',
			},
			{
				displayName: 'Lookup Value',
				name: 'lookupValue',
				type: 'string',
				default: '',
				placeholder: 'frank@example.com',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'lookup'
						],
					},
				},
				description: 'The value to look for in column.',
			},

			// ----------------------------------
			//         Update
			// ----------------------------------
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: 'id',
				displayOptions: {
					show: {
						operation: [
							'update'
						],
						rawData: [
							false
						],
					},
				},
				description: 'The name of the key to identify which<br />data should be updated in the sheet.',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Value Input Mode',
						name: 'valueInputMode',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': [
									'append',
									'update',
								],
							},
						},
						options: [
							{
								name: 'RAW',
								value: 'RAW',
								description: 'The values will not be parsed and will be stored as-is.',
							},
							{
								name: 'User Entered',
								value: 'USER_ENTERED',
								description: 'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.'
							},
						],
						default: 'RAW',
						description: 'Determines how data should be interpreted.',
					},
					{
						displayName: 'Value Render Mode',
						name: 'valueRenderMode',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': [
									'lookup',
									'read',
								],
							},
						},
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
								description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.'
							},
						],
						default: 'UNFORMATTED_VALUE',
						description: 'Determines how values should be rendered in the output.',
					},
					{
						displayName: 'Value Render Mode',
						name: 'valueRenderMode',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': [
									'update',
								],
								'/rawData': [
									false
								],
							},
						},
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
								description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.'
							},
						],
						default: 'UNFORMATTED_VALUE',
						description: 'Determines how values should be rendered in the output.',
					},

				],
			}

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;
		const credentials = this.getCredentials('googleApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const googleCredentials = {
			email: credentials.email,
			privateKey: credentials.privateKey,
		} as IGoogleAuthCredentials;

		const sheet = new GoogleSheet(spreadsheetId, googleCredentials);

		const range = this.getNodeParameter('range', 0) as string;

		const operation = this.getNodeParameter('operation', 0) as string;

		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
		const valueRenderMode = (options.valueRenderMode || 'FORMATTED_VALUE') as ValueRenderOption;

		if (operation === 'append') {
			// ----------------------------------
			//         append
			// ----------------------------------
			const keyRow = this.getNodeParameter('keyRow', 0) as number;

			const items = this.getInputData();

			const setData: IDataObject[] = [];
			items.forEach((item) => {
				setData.push(item.json);
			});

			// Convert data into array format
			const data = await sheet.appendSheetData(setData, range, keyRow, valueInputMode);

			// TODO: Should add this data somewhere
			// TODO: Should have something like add metadata which does not get passed through

			return this.prepareOutputData(items);
		} else if (operation === 'lookup') {
			// ----------------------------------
			//         lookup
			// ----------------------------------

			const sheetData = await sheet.getData(range, valueRenderMode);

			if (sheetData === undefined) {
				return [];
			}

			const dataStartRow = this.getNodeParameter('dataStartRow', 0) as number;
			const keyRow = this.getNodeParameter('keyRow', 0) as number;

			const items = this.getInputData();

			const lookupValues: ILookupValues[] = [];
			for (let i = 0; i < items.length; i++) {
				lookupValues.push({
					lookupColumn: this.getNodeParameter('lookupColumn', i) as string,
					lookupValue: this.getNodeParameter('lookupValue', i) as string,
				});
			}

			const returnData = await sheet.lookupValues(sheetData, keyRow, dataStartRow, lookupValues);

			return [this.helpers.returnJsonArray(returnData)];
		} else if (operation === 'read') {
			// ----------------------------------
			//         read
			// ----------------------------------

			const rawData = this.getNodeParameter('rawData', 0) as boolean;

			const sheetData = await sheet.getData(range, valueRenderMode);

			let returnData: IDataObject[];
			if (!sheetData) {
				returnData = [];
			} else if (rawData === true) {
				const dataProperty = this.getNodeParameter('dataProperty', 0) as string;
				returnData = [
					{
						[dataProperty]: sheetData,
					}
				];
			} else {
				const dataStartRow = this.getNodeParameter('dataStartRow', 0) as number;
				const keyRow = this.getNodeParameter('keyRow', 0) as number;

				returnData = sheet.structureArrayDataByColumn(sheetData, keyRow, dataStartRow);
			}

			return [this.helpers.returnJsonArray(returnData)];
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			const rawData = this.getNodeParameter('rawData', 0) as boolean;

			const items = this.getInputData();

			if (rawData === true) {
				const dataProperty = this.getNodeParameter('dataProperty', 0) as string;

				const updateData: ISheetUpdateData[] = [];
				for (let i = 0; i < items.length; i++) {
					updateData.push({
						range,
						values: items[i].json[dataProperty] as string[][],
					});
				}

				const data = await sheet.batchUpdate(updateData, valueInputMode);
			} else {
				const keyName = this.getNodeParameter('key', 0) as string;
				const keyRow = this.getNodeParameter('keyRow', 0) as number;
				const dataStartRow = this.getNodeParameter('dataStartRow', 0) as number;

				const setData: IDataObject[] = [];
				items.forEach((item) => {
					setData.push(item.json);
				});

				const data = await sheet.updateSheetData(setData, keyName, range, keyRow, dataStartRow, valueInputMode, valueRenderMode);
			}
			// TODO: Should add this data somewhere
			// TODO: Should have something like add metadata which does not get passed through


			return this.prepareOutputData(items);
		}

		return [];
	}
}
