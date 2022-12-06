import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SheetProperties } from '../../helpers/GoogleSheets.types';
import { apiRequest } from '../../transport';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { getExistingSheetNames, hexToRgb } from '../../helpers/GoogleSheets.utils';

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
		},
		description: 'The name of the sheet',
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
		},
		options: [
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

	const existingSheetNames = await getExistingSheetNames(sheet);

	for (let i = 0; i < items.length; i++) {
		const sheetTitle = this.getNodeParameter('title', i, {}) as string;

		if (existingSheetNames.includes(sheetTitle)) {
			continue;
		}

		const options = this.getNodeParameter('options', i, {});
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

		// simplify response
		Object.assign(responseData, responseData.replies[0].addSheet.properties);
		delete responseData.replies;

		existingSheetNames.push(sheetTitle);

		returnData.push(responseData);
	}
	return this.helpers.returnJsonArray(returnData);
}
