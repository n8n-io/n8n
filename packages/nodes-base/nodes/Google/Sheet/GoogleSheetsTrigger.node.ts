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

import {
	arrayOfArraysToJson,
	compareRevisions,
	getRevisionFile,
	sheetBinaryToArrayOfArrays,
} from './GoogleSheetsTrigger.utils';
import { getSheetHeaderRowAndSkipEmpty } from './v2/methods/loadOptions';

const BINARY_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class GoogleSheetsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets Trigger',
		name: 'googleSheetsTrigger',
		icon: 'file:googleSheets.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{($parameter["event"])}}',
		description: 'Starts the workflow when Google Sheets events occur.',
		defaults: {
			name: 'Google Sheets Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleSheetsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
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
							regex: `https:\\/\\/docs\\.google\\.com\/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)`,
						},
						validation: [
							{
								type: 'regex',
								properties: {
									regex: `https:\\/\\/docs\\.google\\.com\/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)`,
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
									regex: '[0-9]{2,}',
									errorMessage: 'Not a valid Sheet ID',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Watch for ...',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'All Updates',
						value: 'allUpdates',
					},
					{
						name: 'Column Changes',
						value: 'columnChanges',
					},
					{
						name: 'Row Added',
						value: 'rowAdded',
					},
				],
				default: 'rowAdded',
				required: true,
			},
			{
				displayName: 'Column Names or IDs',
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
						event: ['columnChanges'],
					},
				},
			},
			{
				displayName: 'Include in Output',
				name: 'includeInOutput',
				type: 'options',
				default: 'currentVersion',
				options: [
					{
						name: 'Current Version',
						value: 'currentVersion',
					},
					{
						name: 'Previous Version',
						value: 'previousVersion',
					},
					{
						name: 'Both Versions',
						value: 'bothVersions',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Data Location on Sheet',
						name: 'locationDefine',
						type: 'fixedCollection',
						placeholder: 'Select Range',
						default: { values: {} },
						options: [
							{
								displayName: 'Values',
								name: 'values',
								values: [
									{
										displayName: 'Range',
										name: 'range',
										type: 'string',
										default: 'A:Z',
										required: true,
										description: 'The table range to read from',
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
										hint: 'From start of range. First row is row 1',
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
										hint: 'From start of range. First row is row 1',
									},
								],
							},
						],
					},
					{
						displayName: 'Value Render Option',
						name: 'valueRenderOption',
						type: 'options',
						options: [
							{
								name: 'Formatted Value',
								value: 'FORMATTED_VALUE',
								description:
									"Values will be calculated & formatted in the reply according to the cell's formatting.Formatting is based on the spreadsheet's locale, not the requesting user's locale.For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return \"$1.23\"",
							},
							{
								name: 'Formula',
								value: 'FORMULA',
								description:
									'Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1".',
							},
							{
								name: 'Unformatted Value',
								value: 'UNFORMATTED_VALUE',
								description:
									'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.',
							},
						],
						default: 'UNFORMATTED_VALUE',
						description: 'Determines how values should be rendered in the output',
					},
					{
						displayName: 'DateTime Render Option',
						name: 'dateTimeRenderOption',
						type: 'options',
						options: [
							{
								name: 'Serial Number',
								value: 'SERIAL_NUMBER',
							},
							{
								name: 'Formatted String',
								value: 'FORMATTED_STRING',
								description:
									'Instructs date, time, datetime, and duration fields to be output as strings in their given number format (which is dependent on the spreadsheet locale)',
							},
						],
						default: 'SERIAL_NUMBER',
						description: 'Determines how dates should be rendered in the output',
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
		const workflowStaticData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event', 0) as string;

		const documentId = this.getNodeParameter('documentId', undefined, {
			extractValue: true,
		}) as string;

		let pageToken;
		const previousRevision = workflowStaticData.lastRevision as number;
		const previousRevisionLink = workflowStaticData.lastRevisionLink as string;
		do {
			const { revisions, nextPageToken } = await apiRequest.call(
				this,
				'GET',
				``,
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
				const lastRevision = +revisions[revisions.length - 1]['id'];
				if (lastRevision <= previousRevision) {
					return null;
				} else {
					workflowStaticData.lastRevision = lastRevision;
					workflowStaticData.lastRevisionLink =
						revisions[revisions.length - 1]['exportLinks'][BINARY_MIME_TYPE];
				}
			}
		} while (pageToken);

		const sheetId = this.getNodeParameter('sheetName', undefined, {
			extractValue: true,
		}) as string;

		const googleSheet = new GoogleSheet(documentId, this);
		const sheetName = await googleSheet.spreadsheetGetSheetNameById(sheetId);
		const options = this.getNodeParameter('options') as IDataObject;

		const locationDefine = ((options.locationDefine as IDataObject) || {}).values as IDataObject;

		let range = 'A:Z';
		let keyRow = 1;
		let startIndex = 2;

		if (locationDefine) {
			if (locationDefine.range) {
				range = locationDefine.range as string;
			}
			if (locationDefine.headerRow) {
				keyRow = parseInt(locationDefine.headerRow as string, 10);
			}
			if (locationDefine.firstDataRow) {
				startIndex = parseInt(locationDefine.firstDataRow as string, 10);
			}

			delete options.locationDefine;
		}

		const qs: IDataObject = {};

		Object.assign(qs, options);

		if (event === 'rowAdded') {
			let rangeToCheck;
			const [rangeFrom, rangeTo] = range.split(':');
			const keyRange = `${rangeFrom}${keyRow}:${rangeTo}${keyRow}`;

			if (workflowStaticData.lastIndexChecked === undefined) {
				rangeToCheck = `${rangeFrom}${startIndex}:${rangeTo}`;
				workflowStaticData.lastIndexChecked = startIndex;
			} else {
				rangeToCheck = `${rangeFrom}${workflowStaticData.lastIndexChecked}:${rangeTo}`;
			}

			const [columns] = (
				(await apiRequest.call(
					this,
					'GET',
					`/v4/spreadsheets/${documentId}/values/${sheetName}!${keyRange}`,
				)) as IDataObject
			).values as string[][];

			if (columns === undefined || columns.length === 0) {
				throw new NodeOperationError(this.getNode(), 'Could not retrieve the columns from key row');
			}

			const { values: sheetData } = await apiRequest.call(
				this,
				'GET',
				`/v4/spreadsheets/${documentId}/values/${sheetName}!${rangeToCheck}`,
				{},
				qs,
			);

			if (Array.isArray(sheetData)) {
				const returnData = arrayOfArraysToJson(sheetData, columns);

				workflowStaticData.lastIndexChecked =
					(workflowStaticData.lastIndexChecked as number) + sheetData.length;

				if (Array.isArray(returnData) && returnData.length !== 0) {
					return [this.helpers.returnJsonArray(returnData)];
				}
			}
		}

		if (event === 'allUpdates' || event === 'columnChanges') {
			const currentData = (await googleSheet.getData(sheetName, 'UNFORMATTED_VALUE')) as string[][];

			if (previousRevision === undefined) {
				const zeroBasedKeyRow = keyRow - 1;
				const columns = currentData[zeroBasedKeyRow];
				currentData.splice(zeroBasedKeyRow, 1); // Remove key row
				const returnData = arrayOfArraysToJson(currentData, columns);

				if (Array.isArray(returnData) && returnData.length !== 0) {
					return [this.helpers.returnJsonArray(returnData)];
				}
			}

			const previousRevisionBinaryData = await getRevisionFile.call(this, previousRevisionLink);

			const previousRevisionSheetData = sheetBinaryToArrayOfArrays(
				previousRevisionBinaryData,
				sheetName,
			);

			const includeInOutput = this.getNodeParameter('includeInOutput', 'currentVersion') as string;

			let returnData;
			if (event === 'columnChanges') {
				const columnsToWatch = this.getNodeParameter('columnsToWatch', undefined) as string[];
				returnData = compareRevisions(
					previousRevisionSheetData,
					currentData,
					keyRow,
					includeInOutput,
					columnsToWatch,
				);
			} else {
				returnData = compareRevisions(
					previousRevisionSheetData,
					currentData,
					keyRow,
					includeInOutput,
				);
			}

			if (Array.isArray(returnData) && returnData.length !== 0) {
				return [this.helpers.returnJsonArray(returnData)];
			}
		}

		return null;
	}
}
