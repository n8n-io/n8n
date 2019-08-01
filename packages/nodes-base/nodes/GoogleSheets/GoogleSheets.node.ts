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
	ISheetUpdateData,
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
		changesIncomingData: {
			value: false,
		},
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
			//         Read & Update
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
							'update'
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
			const data = await sheet.appendSheetData(setData, range, keyRow);

			// TODO: Should add this data somewhere
			// TODO: Should have something like add metadata which does not get passed through

			return this.prepareOutputData(items);
		} else if (operation === 'read') {
			// ----------------------------------
			//         read
			// ----------------------------------

			const rawData = this.getNodeParameter('rawData', 0) as boolean;

			const sheetData = await sheet.getData(range);

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

				const data = await sheet.batchUpdate(updateData);
			} else {
				const keyName = this.getNodeParameter('key', 0) as string;
				const keyRow = this.getNodeParameter('keyRow', 0) as number;
				const dataStartRow = this.getNodeParameter('dataStartRow', 0) as number;


				const setData: IDataObject[] = [];
				items.forEach((item) => {
					setData.push(item.json);
				});

				const data = await sheet.updateSheetData(setData, keyName, range, keyRow, dataStartRow);
			}
			// TODO: Should add this data somewhere
			// TODO: Should have something like add metadata which does not get passed through


			return this.prepareOutputData(items);
		}

		return [];
	}
}
