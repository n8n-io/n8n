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

import * as XLSX from 'xlsx';

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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Row Added',
						value: 'rowAdded',
					},
					{
						name: 'All Updates',
						value: 'allUpdates',
					},
				],
				default: 'rowAdded',
				required: true,
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
				name: 'sheetId',
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
				displayName: 'Range',
				name: 'range',
				type: 'string',
				default: 'A:Z',
				required: true,
				description: 'The table range to read from',
			},
			{
				displayName: 'Key Row',
				name: 'keyRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description:
					'Index of the row which contains the keys. Starts at 1.The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
			{
				displayName: 'Start Index',
				name: 'startIndex',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 2,
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
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const workflowStaticData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event', 0) as string;

		const documentId = this.getNodeParameter('documentId', undefined, {
			extractValue: true,
		}) as string;

		// Check if new revision is available, if not return
		let pageToken;
		const previousRevision = workflowStaticData.lastRevision as number;
		do {
			const { revisions, nextPageToken } = await apiRequest.call(
				this,
				'GET',
				``,
				undefined,
				{
					fields: 'revisions(id), nextPageToken',
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
				console.log(lastRevision, previousRevision);
				if (lastRevision <= previousRevision) {
					return null;
				} else {
					workflowStaticData.lastRevision = lastRevision;
				}
			}
		} while (pageToken);

		const sheetId = this.getNodeParameter('sheetId', undefined, {
			extractValue: true,
		}) as string;

		const googleSheet = new GoogleSheet(documentId, this);

		const sheetName = await googleSheet.spreadsheetGetSheetNameById(sheetId);

		const range = this.getNodeParameter('range') as string;
		const startIndex = this.getNodeParameter('startIndex') as number;
		const keyRow = this.getNodeParameter('keyRow') as number;

		const options = this.getNodeParameter('options') as IDataObject;
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
				const returnData: IDataObject[] = [];

				for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
					const rowData: IDataObject = {};

					for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
						const columnName = columns[columnIndex];
						const cellValue = sheetData[rowIndex][columnIndex] || '';

						rowData[columnName] = cellValue;
					}

					returnData.push(rowData);
				}

				workflowStaticData.lastIndexChecked =
					(workflowStaticData.lastIndexChecked as number) + sheetData.length;

				if (Array.isArray(returnData) && returnData.length !== 0) {
					return [this.helpers.returnJsonArray(returnData)];
				}
			}
		}

		if (event === 'allUpdates') {
			const data = await getRevisionFile.call(
				this,
				documentId,
				workflowStaticData.lastRevision as number,
			);

			if (previousRevision === undefined) {
				//read binary, select sheet, convert data to json
				const workbook = XLSX.read(data, { type: 'buffer', sheets: [sheetName] });
				const sheet = workbook.Sheets[sheetName];
				// const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

				console.log(sheet, Object.keys(workbook.Sheets));
			}

			// temp --------------------
			const newItem: INodeExecutionData = {
				json: {},
				binary: {},
			};

			newItem.binary!['data'] = await this.helpers.prepareBinaryData(
				data as unknown as Buffer,
				'google-sheets.xlsx',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			);

			return [[newItem]];
			// temp --------------------
		}

		return null;
	}
}

async function getRevisionFile(this: IPollFunctions, documentId: string, revisionId: number) {
	const { exportLinks } = await apiRequest.call(
		this,
		'GET',
		``,
		undefined,
		{
			fields: 'exportLinks',
		},
		`https://www.googleapis.com/drive/v2/files/${documentId}/revisions/${revisionId}`,
	);
	const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	const exportLink = exportLinks[mimeType];

	const response = await apiRequest.call(
		this,
		'GET',
		``,
		undefined,
		{ mimeType },
		exportLink,
		undefined,
		{
			resolveWithFullResponse: true,
			encoding: null,
			json: false,
		},
	);

	return Buffer.from(response.body as string);
}
