/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as table from './table/Table.resource';
import * as workbook from './workbook/Workbook.resource';
import * as worksheet from './worksheet/Worksheet.resource';
import { targetDescription } from '../descriptions/TargetDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft Excel (OneDrive)',
	name: 'microsoftExcel',
	icon: 'file:excel.svg',
	group: ['input'],
	version: [2, 2.1, 2.2],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Microsoft Excel API for workbooks stored in OneDrive',
	defaults: {
		name: 'Microsoft Excel (OneDrive)',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'microsoftExcelOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftExcelOAuth2Api'],
				},
			},
		},
		{
			name: 'microsoftOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftOAuth2Api'],
				},
			},
		},
		{
			name: 'microsoftEntraServicePrincipalApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftEntraServicePrincipalApi'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Excel OAuth2',
					value: 'microsoftExcelOAuth2Api',
				},
				{
					name: 'Microsoft OAuth2 (Graph)',
					value: 'microsoftOAuth2Api',
				},
				{
					name: 'Microsoft Entra Service Principal (App-Only)',
					value: 'microsoftEntraServicePrincipalApi',
					description:
						'App-only access via a Microsoft Entra app registration. Choose which user or drive to act on under "Access As".',
				},
			],
			default: 'microsoftExcelOAuth2Api',
		},
		...targetDescription,
		{
			displayName:
				'This node works with workbooks stored in OneDrive on the Microsoft 365 cloud platform. Use the \'Extract from File\' and \'Convert to File\' nodes to directly manipulate spreadsheet files (.xls, .csv, etc). <a href="https://n8n.io/workflows/890-read-in-an-excel-spreadsheet-file/" target="_blank">More info</a>.',
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
