import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { apiRequest } from './v2/transport';
import { sheetsSearch, spreadSheetsSearch } from './v2/methods/listSearch';
import { GoogleSheet } from './v2/helpers/GoogleSheet';
import { getSheetHeaderRowAndSkipEmpty } from './v2/methods/loadOptions';
import { ValueRenderOption } from './v2/helpers/GoogleSheets.types';

import {
	arrayOfArraysToJson,
	BINARY_MIME_TYPE,
	compareRevisions,
	getRevisionFile,
	sheetBinaryToArrayOfArrays,
} from './GoogleSheetsTrigger.utils';

export class GoogleSheetsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets Trigger',
		name: 'googleSheetsTrigger',
		icon: 'file:googleSheets.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{($parameter["event"])}}',
		description: 'Starts the workflow when Google Sheets events occur',
		defaults: {
			name: 'Google Sheets Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleSheetsTriggerOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['triggerOAuth2'],
					},
				},
			},
		],
		polling: true,
		properties: [
			// trigger shared logic with GoogleSheets node, leaving this here for compatibility
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'hidden',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'triggerOAuth2',
					},
				],
				default: 'triggerOAuth2',
			},
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
			},
			{
				displayName: 'Sheet',
				name: 'sheetName',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				// default: '', //empty string set to progresivly reveal fields
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'sheetsSearch',
							searchable: false,
						},
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						extractValue: {
							type: 'regex',
							regex:
								'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
						},
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
									errorMessage: 'Not a valid Sheet URL',
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
									regex: '((gid=)?[0-9]{1,})',
									errorMessage: 'Not a valid Sheet ID',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				description:
					"It will be triggered also by newly created columns (if the 'Columns to Watch' option is not set)",
				options: [
					{
						name: 'Row Added',
						value: 'rowAdded',
					},
					{
						name: 'Row Updated',
						value: 'rowUpdate',
					},
					{
						name: 'Row Added or Updated',
						value: 'anyUpdate',
					},
				],
				default: 'anyUpdate',
				required: true,
			},
			{
				displayName: 'Include in Output',
				name: 'includeInOutput',
				type: 'options',
				default: 'new',
				description: 'This option will be effective only when automatically executing the workflow',
				options: [
					{
						name: 'New Version',
						value: 'new',
					},
					{
						name: 'Old Version',
						value: 'old',
					},
					{
						name: 'Both Versions',
						value: 'both',
					},
				],
				displayOptions: {
					hide: {
						event: ['rowAdded'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Columns to Watch',
						name: 'columnsToWatch',
						type: 'multiOptions',
						description:
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName.value'],
							loadOptionsMethod: 'getSheetHeaderRowAndSkipEmpty',
						},
						default: [],
						displayOptions: {
							show: {
								'/event': ['anyUpdate', 'rowUpdate'],
							},
						},
					},
					{
						displayName: 'Data Location on Sheet',
						name: 'dataLocationOnSheet',
						type: 'fixedCollection',
						placeholder: 'Select Range',
						default: { values: { rangeDefinition: 'specifyRangeA1' } },
						options: [
							{
								displayName: 'Values',
								name: 'values',
								values: [
									{
										displayName: 'Range Definition',
										name: 'rangeDefinition',
										type: 'options',
										options: [
											{
												name: 'Specify Range (A1 Notation)',
												value: 'specifyRangeA1',
												description: 'Manually specify the data range',
											},
											{
												name: 'Specify Range (Rows)',
												value: 'specifyRange',
												description: 'Manually specify the data range',
											},
										],
										default: '',
									},
									{
										displayName: 'Header Row',
										name: 'headerRow',
										type: 'number',
										typeOptions: {
											minValue: 1,
										},
										default: 1,
										description:
											'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
										hint: 'First row is row 1',
										displayOptions: {
											show: {
												rangeDefinition: ['specifyRange'],
											},
										},
									},
									{
										displayName: 'First Data Row',
										name: 'firstDataRow',
										type: 'number',
										typeOptions: {
											minValue: 1,
										},
										default: 2,
										description:
											'Index of the first row which contains the actual data and not the keys. Starts with 1.',
										hint: 'First row is row 1',
										displayOptions: {
											show: {
												rangeDefinition: ['specifyRange'],
											},
										},
									},
									{
										displayName: 'Range',
										name: 'range',
										type: 'string',
										default: '',
										placeholder: 'A:Z',
										description:
											'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details.',
										hint: 'You can specify both the rows and the columns, e.g. C4:E7',
										displayOptions: {
											show: {
												rangeDefinition: ['specifyRangeA1'],
											},
										},
									},
								],
							},
						],
					},
					{
						displayName: 'Value Render',
						name: 'valueRender',
						type: 'options',
						options: [
							{
								name: 'Unformatted',
								value: 'UNFORMATTED_VALUE',
								description: 'Values will be calculated, but not formatted in the reply',
							},
							{
								name: 'Formatted',
								value: 'FORMATTED_VALUE',
								description:
									"Values will be formatted and calculated according to the cell's formatting (based on the spreadsheet's locale)",
							},
							{
								name: 'Formula',
								value: 'FORMULA',
								description: 'Values will not be calculated. The reply will include the formulas.',
							},
						],
						default: 'UNFORMATTED_VALUE',
						description:
							'Determines how values will be rendered in the output. <a href="https://developers.google.com/sheets/api/reference/rest/v4/ValueRenderOption" target="_blank">More info</a>.',
						displayOptions: {
							hide: {
								'/event': ['anyUpdate', 'rowUpdate'],
							},
						},
					},
					{
						displayName: 'DateTime Render',
						name: 'dateTimeRenderOption',
						type: 'options',
						options: [
							{
								name: 'Serial Number',
								value: 'SERIAL_NUMBER',
								description:
									'Fields will be returned as doubles in "serial number" format (as popularized by Lotus 1-2-3)',
							},
							{
								name: 'Formatted String',
								value: 'FORMATTED_STRING',
								description:
									'Fields will be rendered as strings in their given number format (which depends on the spreadsheet locale)',
							},
						],
						default: 'SERIAL_NUMBER',
						description:
							'Determines how dates should be rendered in the output.  <a href="https://developers.google.com/sheets/api/reference/rest/v4/DateTimeRenderOption" target="_blank">More info</a>.',
						displayOptions: {
							hide: {
								'/event': ['anyUpdate', 'rowUpdate'],
							},
						},
					},
				],
			},
		],
	};

	methods = {
		listSearch: { spreadSheetsSearch, sheetsSearch },
		loadOptions: { getSheetHeaderRowAndSkipEmpty },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		try {
			const workflowStaticData = this.getWorkflowStaticData('node');
			const event = this.getNodeParameter('event', 0) as string;

			const documentId = this.getNodeParameter('documentId', undefined, {
				extractValue: true,
			}) as string;

			let sheetId = this.getNodeParameter('sheetName', undefined, {
				extractValue: true,
			}) as string;

			sheetId = sheetId === 'gid=0' ? '0' : sheetId;

			// If the documentId or sheetId changed, reset the workflow static data
			if (
				this.getMode() !== 'manual' &&
				(workflowStaticData.documentId !== documentId || workflowStaticData.sheetId !== sheetId)
			) {
				workflowStaticData.documentId = documentId;
				workflowStaticData.sheetId = sheetId;
				workflowStaticData.lastRevision = undefined;
				workflowStaticData.lastRevisionLink = undefined;
				workflowStaticData.lastIndexChecked = undefined;
			}

			const googleSheet = new GoogleSheet(documentId, this);
			const sheetName = await googleSheet.spreadsheetGetSheetNameById(sheetId);
			const options = this.getNodeParameter('options') as IDataObject;

			const previousRevision = workflowStaticData.lastRevision as number;
			const previousRevisionLink = workflowStaticData.lastRevisionLink as string;

			if (event !== 'rowAdded') {
				let pageToken;
				do {
					const { revisions, nextPageToken } = await apiRequest.call(
						this,
						'GET',
						'',
						undefined,
						{
							fields: 'revisions(id, exportLinks), nextPageToken',
							pageToken,
							pageSize: 1000,
						},
						`https://www.googleapis.com/drive/v3/files/${documentId}/revisions`,
					);

					if (nextPageToken) {
						pageToken = nextPageToken as string;
					} else {
						pageToken = undefined;

						const lastRevision = +revisions[revisions.length - 1].id;
						if (lastRevision <= previousRevision) {
							return null;
						} else {
							if (this.getMode() !== 'manual') {
								workflowStaticData.lastRevision = lastRevision;
								workflowStaticData.lastRevisionLink =
									revisions[revisions.length - 1].exportLinks[BINARY_MIME_TYPE];
							}
						}
					}
				} while (pageToken);
			}

			let range = 'A:ZZZ';
			let keyRow = 1;
			let startIndex = 2;

			let rangeDefinition = '';

			const [from, to] = range.split(':');
			let keyRange = `${from}${keyRow}:${to}${keyRow}`;
			let rangeToCheck = `${from}${startIndex}:${to}`;

			if (options.dataLocationOnSheet) {
				const locationDefine = (options.dataLocationOnSheet as IDataObject).values as IDataObject;
				rangeDefinition = locationDefine.rangeDefinition as string;

				if (rangeDefinition === 'specifyRangeA1') {
					if (locationDefine.range === '') {
						throw new NodeOperationError(
							this.getNode(),
							"The field 'Range' is empty, please provide a range",
						);
					}
					range = locationDefine.range as string;
				}

				if (rangeDefinition === 'specifyRange') {
					keyRow = parseInt(locationDefine.headerRow as string, 10);
					startIndex = parseInt(locationDefine.firstDataRow as string, 10);
				}

				const [rangeFrom, rangeTo] = range.split(':');
				const cellDataFrom = rangeFrom.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) ?? [];
				const cellDataTo = rangeTo.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) ?? [];

				if (rangeDefinition === 'specifyRangeA1' && cellDataFrom[2] !== undefined) {
					keyRange = `${cellDataFrom[1]}${+cellDataFrom[2]}:${cellDataTo[1]}${+cellDataFrom[2]}`;
					rangeToCheck = `${cellDataFrom[1]}${+cellDataFrom[2] + 1}:${rangeTo}`;
				} else {
					keyRange = `${cellDataFrom[1]}${keyRow}:${cellDataTo[1]}${keyRow}`;
					rangeToCheck = `${cellDataFrom[1]}${startIndex}:${rangeTo}`;
				}
			}

			const qs: IDataObject = {};

			Object.assign(qs, options);

			if (event === 'rowAdded') {
				const [columns] = ((
					(await apiRequest.call(
						this,
						'GET',
						`/v4/spreadsheets/${documentId}/values/${sheetName}!${keyRange}`,
					)) as IDataObject
				).values as string[][]) || [[]];

				if (!columns?.length) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not retrieve the columns from key row',
					);
				}

				const sheetData = await googleSheet.getData(
					`${sheetName}!${rangeToCheck}`,
					(options.valueRender as ValueRenderOption) || 'UNFORMATTED_VALUE',
					(options.dateTimeRenderOption as string) || 'FORMATTED_STRING',
				);

				if (this.getMode() === 'manual') {
					if (Array.isArray(sheetData)) {
						const returnData = arrayOfArraysToJson(sheetData, columns);

						if (Array.isArray(returnData) && returnData.length !== 0) {
							return [this.helpers.returnJsonArray(returnData)];
						}
					}
				}

				if (Array.isArray(sheetData) && this.getMode() !== 'manual') {
					if (workflowStaticData.lastIndexChecked === undefined) {
						workflowStaticData.lastIndexChecked = sheetData.length;
						return null;
					}

					const addedRows = sheetData?.slice(workflowStaticData.lastIndexChecked as number) ?? [];
					const returnData = arrayOfArraysToJson(addedRows, columns);

					workflowStaticData.lastIndexChecked = sheetData.length;

					if (Array.isArray(returnData) && returnData.length !== 0) {
						return [this.helpers.returnJsonArray(returnData)];
					}
				}
			}

			if (event === 'anyUpdate' || event === 'rowUpdate') {
				const sheetRange = `${sheetName}!${range}`;

				let dataStartIndex = startIndex - 1;
				if (rangeDefinition !== 'specifyRangeA1') {
					dataStartIndex = keyRow < startIndex ? startIndex - 2 : startIndex - 1;
				}

				const currentData =
					((await googleSheet.getData(
						sheetRange,
						'UNFORMATTED_VALUE',
						'SERIAL_NUMBER',
					)) as string[][]) || [];

				if (previousRevision === undefined) {
					if (currentData.length === 0) {
						return [[]];
					}
					const zeroBasedKeyRow = keyRow - 1;
					const columns = currentData[zeroBasedKeyRow];
					currentData.splice(zeroBasedKeyRow, 1); // Remove key row

					let returnData;
					if (rangeDefinition !== 'specifyRangeA1') {
						returnData = arrayOfArraysToJson(currentData.slice(dataStartIndex), columns);
					} else {
						returnData = arrayOfArraysToJson(currentData, columns);
					}

					if (Array.isArray(returnData) && returnData.length !== 0 && this.getMode() === 'manual') {
						return [this.helpers.returnJsonArray(returnData)];
					} else {
						return null;
					}
				}

				const previousRevisionBinaryData = await getRevisionFile.call(this, previousRevisionLink);

				const previousRevisionSheetData =
					sheetBinaryToArrayOfArrays(
						previousRevisionBinaryData,
						sheetName,
						rangeDefinition === 'specifyRangeA1' ? range : undefined,
					) || [];

				const includeInOutput = this.getNodeParameter('includeInOutput', 'new') as string;

				let returnData;
				if (options.columnsToWatch) {
					returnData = compareRevisions(
						previousRevisionSheetData,
						currentData,
						keyRow,
						includeInOutput,
						options.columnsToWatch as string[],
						dataStartIndex,
						event,
					);
				} else {
					returnData = compareRevisions(
						previousRevisionSheetData,
						currentData,
						keyRow,
						includeInOutput,
						[],
						dataStartIndex,
						event,
					);
				}

				if (Array.isArray(returnData) && returnData.length !== 0) {
					return [this.helpers.returnJsonArray(returnData)];
				}
			}
		} catch (error) {
			if (
				error?.description
					?.toLowerCase()
					.includes('user does not have sufficient permissions for file')
			) {
				throw new NodeOperationError(
					this.getNode(),
					"Edit access to the document is required for the 'Row Update' and 'Row Added or Updated' triggers. Request edit access to the document's owner or select the 'Row Added' trigger in the 'Trigger On' dropdown.",
				);
			}
			if (
				error?.error?.error?.message !== undefined &&
				!(error.error.error.message as string).toLocaleLowerCase().includes('unknown error') &&
				!(error.error.error.message as string).toLocaleLowerCase().includes('bad request')
			) {
				// eslint-disable-next-line prefer-const
				let [message, ...description] = (error.error.error.message as string).split('. ');
				if (message.toLowerCase() === 'access not configured') {
					message = 'Missing Google Drive API';
				}
				throw new NodeOperationError(this.getNode(), message, {
					description: description.join('.\n '),
				});
			}
			throw error;
		}
		return null;
	}
}
