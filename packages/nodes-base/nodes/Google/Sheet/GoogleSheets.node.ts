
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	GoogleSheet,
	ILookupValues,
	ISheetUpdateData,
	IToDelete,
	ValueInputOption,
	ValueRenderOption,
} from './GoogleSheet';

import {
	googleApiRequest,
} from './GenericFunctions';

export class GoogleSheets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets ',
		name: 'googleSheets',
		icon: 'file:googlesheets.png',
		group: ['input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read, update and write data to Google Sheets',
		defaults: {
			name: 'Google Sheets',
			color: '#0aa55c',
		},
		inputs: ['main'],
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Spreadsheet',
						value: 'spreadsheet',
					},
					{
						name: 'Sheet',
						value: 'sheet',
					},

				],
				default: 'sheet',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
					},
				},
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append data to a sheet',
					},
					{
						name: 'Clear',
						value: 'clear',
						description: 'Clear data from a sheet',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete columns and rows from a sheet',
					},
					{
						name: 'Lookup',
						value: 'lookup',
						description: 'Look up a specific column value and return the matching row',
					},
					{
						name: 'Read',
						value: 'read',
						description: 'Read data from a sheet',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in a sheet',
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
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
					},
				},
				default: '',
				required: true,
				description: 'The ID of the Google Sheet.<br />Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
					},
					hide: {
						operation: [
							'delete',
						],
					},
				},
				default: 'A:F',
				required: true,
				description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details.<br />If it contains multiple sheets it can also be<br />added like this: "MySheet!A:F"',
			},


			// ----------------------------------
			//         Delete
			// ----------------------------------
			{
				displayName: 'To Delete',
				name: 'toDelete',
				placeholder: 'Add Columns/Rows to delete',
				description: 'Deletes columns and rows from a sheet.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
						operation: [
							'delete',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Columns',
						name: 'columns',
						values: [
							{
								displayName: 'Sheet',
								name: 'sheetId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getSheets',
								},
								options: [],
								default: '',
								required: true,
								description: 'The sheet to delete columns from',
							},
							{
								displayName: 'Start Index',
								name: 'startIndex',
								type: 'number',
								typeOptions: {
									minValue: 0,
								},
								default: 0,
								description: 'The start index (0 based and inclusive) of column to delete.',
							},
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'number',
								typeOptions: {
									minValue: 1,
								},
								default: 1,
								description: 'Number of columns to delete.',
							},
						],
					},
					{
						displayName: 'Rows',
						name: 'rows',
						values: [
							{
								displayName: 'Sheet',
								name: 'sheetId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getSheets',
								},
								options: [],
								default: '',
								required: true,
								description: 'The sheet to delete columns from',
							},
							{
								displayName: 'Start Index',
								name: 'startIndex',
								type: 'number',
								typeOptions: {
									minValue: 0,
								},
								default: 0,
								description: 'The start index (0 based and inclusive) of row to delete.',
							},
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'number',
								typeOptions: {
									minValue: 1,
								},
								default: 1,
								description: 'Number of rows to delete.',
							},
						],
					},
				],
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
						resource: [
							'sheet',
						],
						operation: [
							'read',
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
						resource: [
							'sheet',
						],
						operation: [
							'read',
						],
						rawData: [
							true,
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
						resource: [
							'sheet',
						],
						operation: [
							'update',
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
						resource: [
							'sheet',
						],
						operation: [
							'update',
						],
						rawData: [
							true,
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
					show: {
						resource: [
							'sheet',
						],
					},
					hide: {
						operation: [
							'append',
							'clear',
							'delete',
						],
						rawData: [
							true,
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
					show: {
						resource: [
							'sheet',
						],
					},
					hide: {
						operation: [
							'clear',
							'delete',
						],
						rawData: [
							true,
						],
					},
				},
				default: 0,
				description: 'Index of the row which contains the keys. Starts at 0.<br />The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
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
						resource: [
							'sheet',
						],
						operation: [
							'lookup',
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
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
						operation: [
							'lookup',
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
						resource: [
							'sheet',
						],
						operation: [
							'update',
						],
						rawData: [
							false,
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
				displayOptions: {
					show: {
						resource: [
							'sheet',
						],
						operation: [
							'append',
							'lookup',
							'read',
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'Continue If Empty',
						name: 'continue',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/operation': [
									'lookup',
									'read',
								],
							},
						},
						description: 'By default, the workflow stops executing if the lookup/read does not return values.',
					},
					{
						displayName: 'Return All Matches',
						name: 'returnAllMatches',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/operation': [
									'lookup',
								],
							},
						},
						description: 'By default only the first result gets returned. If options gets set all found matches get returned.',
					},
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
								description: 'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
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
								description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.',
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
									false,
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
								description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.',
							},
						],
						default: 'UNFORMATTED_VALUE',
						description: 'Determines how values should be rendered in the output.',
					},

				],
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'spreadsheet',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a spreadsheet',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         spreadsheet:create
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'spreadsheet',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'The title of the spreadsheet.',
			},
			{
				displayName: 'Sheets',
				name: 'sheetsUi',
				placeholder: 'Add Sheet',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'sheetValues',
						displayName: 'Sheet',
						values: [
							{
								displayName: 'Sheet Properties',
								name: 'propertiesUi',
								placeholder: 'Add Property',
								type: 'collection',
								default: {},
								options: [
									{
										displayName: 'Hidden',
										name: 'hidden',
										type: 'boolean',
										default: false,
										description: 'If the Sheet should be hidden in the UI',
									},
									{
										displayName: 'Title',
										name: 'title',
										type: 'string',
										default: '',
										description: 'Title of the property to create',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'spreadsheet',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: '',
						placeholder: 'en_US',
						description: 'The locale of the spreadsheet in one of the following formats:<br /><ul><li>en (639-1)</li><li>fil (639-2 if no 639-1 format exists)</li><li>en_US (combination of ISO language an country)</li><ul>',
					},
					{
						displayName: 'Recalculation Interval',
						name: 'autoRecalc',
						type: 'options',
						options: [
							{
								name: 'Default',
								value: '',
								description: 'Default value',
							},
							{
								name: 'On Change',
								value: 'ON_CHANGE',
								description: 'Volatile functions are updated on every change.',
							},
							{
								name: 'Minute',
								value: 'MINUTE',
								description: 'Volatile functions are updated on every change and every minute.',
							},
							{
								name: 'Hour',
								value: 'HOUR',
								description: '	Volatile functions are updated on every change and hourly.',
							},
						],
						default: '',
						description: 'Cell recalculation interval options.',
					},
				],
			},
		],
	};


	methods = {
		loadOptions: {
			// Get all the sheets in a Spreadsheet
			async getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spreadsheetId = this.getCurrentNodeParameter('sheetId') as string;

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
						value: sheet.properties!.sheetId as unknown as string,
					});
				}

				return returnData;
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		if (resource === 'sheet') {

			const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;

			const sheet = new GoogleSheet(spreadsheetId, this);

			let range = '';
			if (operation !== 'delete') {
				range = this.getNodeParameter('range', 0) as string;
			}

			const options = this.getNodeParameter('options', 0, {}) as IDataObject;

			const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
			const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

			if (operation === 'append') {
				// ----------------------------------
				//         append
				// ----------------------------------
				const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

				const items = this.getInputData();

				const setData: IDataObject[] = [];
				items.forEach((item) => {
					setData.push(item.json);
				});

				// Convert data into array format
				const data = await sheet.appendSheetData(setData, sheet.encodeRange(range), keyRow, valueInputMode);

				// TODO: Should add this data somewhere
				// TODO: Should have something like add metadata which does not get passed through

				return this.prepareOutputData(items);
			} else if (operation === 'clear') {
				// ----------------------------------
				//         clear
				// ----------------------------------

				await sheet.clearData(sheet.encodeRange(range));

				const items = this.getInputData();
				return this.prepareOutputData(items);
			} else if (operation === 'delete') {
				// ----------------------------------
				//         delete
				// ----------------------------------

				const requests: IDataObject[] = [];

				const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

				const deletePropertyToDimensions: IDataObject = {
					'columns': 'COLUMNS',
					'rows': 'ROWS',
				};

				for (const propertyName of Object.keys(deletePropertyToDimensions)) {
					if (toDelete[propertyName] !== undefined) {
						toDelete[propertyName]!.forEach(range => {
							requests.push({
								deleteDimension: {
									range: {
										sheetId: range.sheetId,
										dimension: deletePropertyToDimensions[propertyName] as string,
										startIndex: range.startIndex,
										endIndex: parseInt(range.startIndex.toString(), 10) + parseInt(range.amount.toString(), 10),
									},
								},
							});
						});
					}
				}

				const data = await sheet.spreadsheetBatchUpdate(requests);

				const items = this.getInputData();
				return this.prepareOutputData(items);
			} else if (operation === 'lookup') {
				// ----------------------------------
				//         lookup
				// ----------------------------------

				const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

				if (sheetData === undefined) {
					return [];
				}

				const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);
				const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

				const items = this.getInputData();

				const lookupValues: ILookupValues[] = [];
				for (let i = 0; i < items.length; i++) {
					lookupValues.push({
						lookupColumn: this.getNodeParameter('lookupColumn', i) as string,
						lookupValue: this.getNodeParameter('lookupValue', i) as string,
					});
				}

				let returnData = await sheet.lookupValues(sheetData, keyRow, dataStartRow, lookupValues, options.returnAllMatches as boolean | undefined);

				if (returnData.length === 0 && options.continue && options.returnAllMatches) {
					returnData = [{}];
				} else if (returnData.length === 1 && Object.keys(returnData[0]).length === 0 && !options.continue && !options.returnAllMatches) {
					returnData = [];
				}

				return [this.helpers.returnJsonArray(returnData)];
			} else if (operation === 'read') {
				// ----------------------------------
				//         read
				// ----------------------------------

				const rawData = this.getNodeParameter('rawData', 0) as boolean;

				const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

				let returnData: IDataObject[];
				if (!sheetData) {
					returnData = [];
				} else if (rawData === true) {
					const dataProperty = this.getNodeParameter('dataProperty', 0) as string;
					returnData = [
						{
							[dataProperty]: sheetData,
						},
					];
				} else {
					const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);
					const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

					returnData = sheet.structureArrayDataByColumn(sheetData, keyRow, dataStartRow);
				}

				if (returnData.length === 0 && options.continue) {
					returnData = [{}];
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
					const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);
					const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);

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

		}

		if (resource === 'spreadsheet') {

			const returnData: IDataObject[] = [];

			let responseData;

			if (operation === 'create') {
				// ----------------------------------
				//         create
				// ----------------------------------
				// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/create

				for (let i = 0; i < this.getInputData().length; i++) {

					const title = this.getNodeParameter('title', i) as string;
					const sheetsUi = this.getNodeParameter('sheetsUi', i, {}) as IDataObject;

					const body = {
						properties: {
							title,
							autoRecalc: undefined as undefined | string,
							locale: undefined as undefined | string,
						},
						sheets: [] as IDataObject[],
					};

					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					if (Object.keys(sheetsUi).length) {
						const data = [];
						const sheets = sheetsUi.sheetValues as IDataObject[];
						for (const sheet of sheets) {
							const properties = sheet.propertiesUi as IDataObject;
							if (properties) {
								data.push({ properties });
							}
						}
						body.sheets = data;
					}

					body.properties!.autoRecalc = options.autoRecalc ? (options.autoRecalc as string) : undefined;
					body.properties!.locale = options.locale ? (options.locale as string) : undefined;

					responseData = await googleApiRequest.call(this, 'POST', `/v4/spreadsheets`, body);

					returnData.push(responseData);
				}

			}

			return [this.helpers.returnJsonArray(returnData)];
		}

		return [];
	}
}
