/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as table from './table/Table.resource';
import * as workbook from './workbook/Workbook.resource';
import * as worksheet from './worksheet/Worksheet.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft Excel 365',
	name: 'microsoftExcel',
	icon: 'file:excel.svg',
	group: ['input'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Microsoft Excel API',
	defaults: {
		name: 'Microsoft Excel 365',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'microsoftExcelOAuth2Api',
			required: true,
		},
	],
	properties: [
		{
			displayName:
				'This node connects to the Microsoft 365 cloud platform. Use the \'Spreadsheet File\' node to directly manipulate spreadsheet files (.xls, .csv, etc). <a href="/templates/890" target="_blank">More info</a>.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Table',
					value: 'table',
					description: 'Represents an Excel table',
				},
				{
					name: 'Workbook',
					value: 'workbook',
					description: 'A workbook is the top level object which contains one or more worksheets',
				},
				{
					name: 'Sheet',
					value: 'worksheet',
					description: 'A sheet is a grid of cells which can contain data, tables, charts, etc',
				},
			],
			default: 'workbook',
		},
		...table.description,
		...workbook.description,
		...worksheet.description,
	],
};
