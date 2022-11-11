import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeOperationError,
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
	getAccessToken,
	googleApiRequest,
	hexToRgb,
	IGoogleAuthCredentials,
} from './GenericFunctions';

import { versionDescription } from './versionDescription';

export class GoogleSheetsV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			// Get all the sheets in a Spreadsheet
			async getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spreadsheetId = this.getCurrentNodeParameter('sheetId') as string;

				const sheet = new GoogleSheet(spreadsheetId, this);
				const responseData = await sheet.spreadsheetGetSheets();

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
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
		credentialTest: {
			async googleApiCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					const tokenRequest = await getAccessToken.call(
						this,
						credential.data! as unknown as IGoogleAuthCredentials,
					);
					if (!tokenRequest.access_token) {
						return {
							status: 'Error',
							message: 'Could not generate a token from your private key.',
						};
					}
				} catch (err) {
					return {
						status: 'Error',
						message: `Private key validation failed: ${err.message}`,
					};
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
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
			if (!['create', 'delete', 'remove'].includes(operation)) {
				range = this.getNodeParameter('range', 0) as string;
			}

			const options = this.getNodeParameter('options', 0, {}) as IDataObject;

			const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
			const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

			if (operation === 'append') {
				// ----------------------------------
				//         append
				// ----------------------------------
				try {
					const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

					const items = this.getInputData();

					const setData: IDataObject[] = [];
					items.forEach((item) => {
						setData.push(item.json);
					});

					const usePathForKeyRow = (options.usePathForKeyRow || false) as boolean;

					// Convert data into array format
					const _data = await sheet.appendSheetData(
						setData,
						sheet.encodeRange(range),
						keyRow,
						valueInputMode,
						usePathForKeyRow,
					);

					// TODO: Should add this data somewhere
					// TODO: Should have something like add metadata which does not get passed through

					return this.prepareOutputData(items);
				} catch (error) {
					if (this.continueOnFail()) {
						return this.prepareOutputData([{ json: { error: error.message } }]);
					}
					throw error;
				}
			} else if (operation === 'clear') {
				// ----------------------------------
				//         clear
				// ----------------------------------
				try {
					await sheet.clearData(sheet.encodeRange(range));

					const items = this.getInputData();
					return this.prepareOutputData(items);
				} catch (error) {
					if (this.continueOnFail()) {
						return this.prepareOutputData([{ json: { error: error.message } }]);
					}
					throw error;
				}
			} else if (operation === 'create') {
				const returnData: IDataObject[] = [];

				let responseData;
				for (let i = 0; i < this.getInputData().length; i++) {
					try {
						const spreadsheetId = this.getNodeParameter('sheetId', i) as string;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const simple = this.getNodeParameter('simple', 0) as boolean;
						const properties = { ...options };

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

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
							{ requests },
						);

						if (simple === true) {
							Object.assign(responseData, responseData.replies[0].addSheet.properties);
							delete responseData.replies;
						}
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}

				return [this.helpers.returnJsonArray(returnData)];
			} else if (operation === 'delete') {
				// ----------------------------------
				//         delete
				// ----------------------------------
				try {
					const requests: IDataObject[] = [];

					const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

					const deletePropertyToDimensions: IDataObject = {
						columns: 'COLUMNS',
						rows: 'ROWS',
					};

					for (const propertyName of Object.keys(deletePropertyToDimensions)) {
						if (toDelete[propertyName] !== undefined) {
							toDelete[propertyName]!.forEach((range) => {
								requests.push({
									deleteDimension: {
										range: {
											sheetId: range.sheetId,
											dimension: deletePropertyToDimensions[propertyName] as string,
											startIndex: range.startIndex,
											endIndex:
												parseInt(range.startIndex.toString(), 10) +
												parseInt(range.amount.toString(), 10),
										},
									},
								});
							});
						}
					}

					const _data = await sheet.spreadsheetBatchUpdate(requests);

					const items = this.getInputData();
					return this.prepareOutputData(items);
				} catch (error) {
					if (this.continueOnFail()) {
						return this.prepareOutputData([{ json: { error: error.message } }]);
					}
					throw error;
				}
			} else if (operation === 'lookup') {
				// ----------------------------------
				//         lookup
				// ----------------------------------
				try {
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

					let returnData = await sheet.lookupValues(
						sheetData,
						keyRow,
						dataStartRow,
						lookupValues,
						options.returnAllMatches as boolean | undefined,
					);

					if (returnData.length === 0 && options.continue && options.returnAllMatches) {
						returnData = [{}];
					} else if (
						returnData.length === 1 &&
						Object.keys(returnData[0]).length === 0 &&
						!options.continue &&
						!options.returnAllMatches
					) {
						returnData = [];
					}

					return [this.helpers.returnJsonArray(returnData)];
				} catch (error) {
					if (this.continueOnFail()) {
						return [this.helpers.returnJsonArray({ error: error.message })];
					}
					throw error;
				}
			} else if (operation === 'read') {
				// ----------------------------------
				//         read
				// ----------------------------------
				try {
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
				} catch (error) {
					if (this.continueOnFail()) {
						return [this.helpers.returnJsonArray({ error: error.message })];
					}
					throw error;
				}
			} else if (operation === 'remove') {
				const returnData: IDataObject[] = [];

				let responseData;
				for (let i = 0; i < this.getInputData().length; i++) {
					try {
						const sheetId = this.getNodeParameter('id', i) as string;
						const spreadsheetId = this.getNodeParameter('sheetId', i) as string;

						const requests = [
							{
								deleteSheet: {
									sheetId,
								},
							},
						];

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
							{ requests },
						);
						delete responseData.replies;
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}

				return [this.helpers.returnJsonArray(returnData)];
			} else if (operation === 'update' || operation === 'upsert') {
				// ----------------------------------
				//         update/upsert
				// ----------------------------------
				const upsert = operation === 'upsert' ? true : false;
				try {
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

						const _data = await sheet.batchUpdate(updateData, valueInputMode);
					} else {
						const keyName = this.getNodeParameter('key', 0) as string;
						const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);
						const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);

						const setData: IDataObject[] = [];
						items.forEach((item) => {
							setData.push(item.json);
						});

						const _data = await sheet.updateSheetData(
							setData,
							keyName,
							range,
							keyRow,
							dataStartRow,
							valueInputMode,
							valueRenderMode,
							upsert,
						);
					}
					// TODO: Should add this data somewhere
					// TODO: Should have something like add metadata which does not get passed through

					return this.prepareOutputData(items);
				} catch (error) {
					if (this.continueOnFail()) {
						return this.prepareOutputData([{ json: { error: error.message } }]);
					}
					throw error;
				}
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
					try {
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

						body.properties!.autoRecalc = options.autoRecalc
							? (options.autoRecalc as string)
							: undefined;
						body.properties!.locale = options.locale ? (options.locale as string) : undefined;

						responseData = await googleApiRequest.call(this, 'POST', `/v4/spreadsheets`, body);

						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.message });
							continue;
						}
						throw error;
					}
				}
			}

			return [this.helpers.returnJsonArray(returnData)];
		}

		return [];
	}
}
