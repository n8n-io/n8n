import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SheetProperties } from '../../helper/GoogleSheets.types';
import { apiRequest } from '../../transport';
import { GoogleSheet } from '../../helper/GoogleSheet';
import { hexToRgb } from '../../helper/GoogleSheets.utils';

export const description: SheetProperties = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: 'n8n-sheet',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['create'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description: 'The name of the sheet',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['create'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['create'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [
			{
				displayName: 'Grid Properties',
				name: 'gridProperties',
				type: 'collection',
				placeholder: 'Add Property',
				default: {},
				options: [
					{
						displayName: 'Column Count',
						name: 'columnCount',
						type: 'number',
						default: 0,
						description: 'The number of columns in the grid',
					},
					{
						displayName: 'Column Group Control After',
						name: 'columnGroupControlAfter',
						type: 'boolean',
						default: false,
						description: 'Whether the column grouping control toggle is shown after the group',
					},
					{
						displayName: 'Frozen Column Count',
						name: 'frozenColumnCount',
						type: 'number',
						default: 0,
						description: 'The number of columns that are frozen in the grid',
					},
					{
						displayName: 'Frozen Row Count',
						name: 'frozenRowCount',
						type: 'number',
						default: 0,
						description: 'The number of rows that are frozen in the grid',
					},
					{
						displayName: 'Hide Gridlines',
						name: 'hideGridlines',
						type: 'boolean',
						default: false,
						description: "Whether the grid isn't showing gridlines in the UI",
					},
					{
						displayName: 'Row Count',
						name: 'rowCount',
						type: 'number',
						default: 0,
						description: 'The number of rows in the grid',
					},
					{
						displayName: 'Row Group Control After',
						name: 'rowGroupControlAfter',
						type: 'boolean',
						default: false,
						description: 'Whether the row grouping control toggle is shown after the group',
					},
				],
				description: 'The type of the sheet',
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: "Whether the sheet is hidden in the UI, false if it's visible",
			},
			{
				displayName: 'Right To Left',
				name: 'rightToLeft',
				type: 'boolean',
				default: false,
				description: 'Whether the sheet is an RTL sheet instead of an LTR sheet',
			},
			{
				displayName: 'Sheet ID',
				name: 'sheetId',
				type: 'number',
				default: 0,
				description:
					'The ID of the sheet. Must be non-negative. This field cannot be changed once set.',
			},
			{
				displayName: 'Sheet Index',
				name: 'index',
				type: 'number',
				default: 0,
				description: 'The index of the sheet within the spreadsheet',
			},
			{
				displayName: 'Tab Color',
				name: 'tabColor',
				type: 'color',
				default: '0aa55c',
				description: 'The color of the tab in the UI',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	let responseData;
	const returnData: IDataObject[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const sheetTitle = this.getNodeParameter('title', i, {}) as string;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const simple = this.getNodeParameter('simple', i) as boolean;
		const properties = { ...options };
		properties.title = sheetTitle;

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
		responseData = await apiRequest.call(
			this,
			'POST',
			`/v4/spreadsheets/${sheetName}:batchUpdate`,
			{ requests },
		);

		if (simple === true) {
			Object.assign(responseData, responseData.replies[0].addSheet.properties);
			delete responseData.replies;
		}
		returnData.push(responseData);
	}
	return this.helpers.returnJsonArray(returnData);
}
