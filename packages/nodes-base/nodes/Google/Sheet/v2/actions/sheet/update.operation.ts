import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { ValueInputOption, ValueRenderOption } from '../../helpers/GoogleSheets.types';
import { SheetProperties } from '../../helpers/GoogleSheets.types';
import { untilSheetSelected } from '../../helpers/GoogleSheets.utils';

export const description: SheetProperties = [
	// DB Data Mapping
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Match',
				value: 'autoMatch',
				description: 'Attempt to automatically find the field',
			},
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				operation: ['update'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Field to Match On',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['update'],
				dataToSend: ['defineBelow'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName'],
							loadOptionsMethod: 'getSheetHeaderRow',
						},
						default: '',
					},
					{
						displayName: 'Value of Column to Match On',
						name: 'valueToMatchOn',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Select Column Name or ID',
		name: 'fieldsUi',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['update'],
				dataToSend: ['autoMatch'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['sheetName'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: {},
	},
	// END DB DATA MAPPING
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['update'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [
			{
				displayName: 'Cell Format',
				name: 'cellFormat',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				options: [
					{
						name: 'Use Format From N8N',
						value: 'RAW',
						description: 'The values will not be parsed and will be stored as-is',
					},
					{
						name: 'Automatic',
						value: 'USER_ENTERED',
						description:
							'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
					},
				],
				default: 'RAW',
				description: 'Determines how data should be interpreted',
			},
			{
				displayName: 'Header Row',
				name: 'headerRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				default: 1,
				description:
					'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
			{
				displayName: 'Data Start Row',
				name: 'dataStartRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				default: 2,
				description: 'Index of the row to start inserting from',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		// ###
		// Data Location Options
		// ###

		const range = `${sheetName}!A:ZZZ`;
		// Need to sub 1 as the API starts from 0
		const keyRow = parseInt(options.headerRow as string, 10) - 1 || 0;
		const dataStartRow = parseInt(options.dataStartRow as string, 10) - 1 || 1;

		// ###
		// Output Format Options
		// ###
		const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
		const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

		// ###
		// Data Mapping
		// ###
		const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMatch';

		const setData: IDataObject[] = [];
		let keyName = '';

		if (dataToSend === 'autoMatch') {
			setData.push(items[i].json);
			keyName = this.getNodeParameter('fieldsUi', 0) as string;
		} else {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', 0, []) as IDataObject;
			let dataToSend: IDataObject = {};

			dataToSend = { ...dataToSend, [fields.fieldId as string]: fields.valueToMatchOn };
			keyName = fields.fieldId as string;
			setData.push(dataToSend);
		}

		const data = await sheet.updateSheetData(
			setData,
			keyName,
			range,
			keyRow,
			dataStartRow,
			valueInputMode,
			valueRenderMode,
			true,
		);
	}
	return items;
}
