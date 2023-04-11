import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Use Query String',
		name: 'useQueryString',
		type: 'boolean',
		default: false,
		description: 'Whether a query string should be used to filter results',
	},
	{
		displayName: 'Query String',
		name: 'queryString',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				useQueryString: [true],
			},
		},
		placeholder: "name contains 'invoice'",
		description: 'Query to use to return only specific files',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'queryFilters',
		placeholder: 'Add Filter',
		description: 'Filters to use to return only specific files',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				useQueryString: [false],
			},
		},
		options: [
			{
				name: 'name',
				displayName: 'Name',
				values: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						noDataExpression: true,
						options: [
							{
								name: 'Contains',
								value: 'contains',
							},
							{
								name: 'Is',
								value: 'is',
							},
							{
								name: 'Is Not',
								value: 'isNot',
							},
						],
						default: 'contains',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value for operation',
					},
				],
			},
			{
				name: 'mimeType',
				displayName: 'Mime Type',
				values: [
					{
						displayName: 'Mime Type',
						name: 'mimeType',
						type: 'options',
						options: [
							{
								name: '3rd Party Shortcut',
								value: 'application/vnd.google-apps.drive-sdk',
							},
							{
								name: 'Audio',
								value: 'application/vnd.google-apps.audio',
							},
							{
								name: 'Custom Mime Type',
								value: 'custom',
							},
							{
								name: 'Google Apps Scripts',
								value: 'application/vnd.google-apps.script',
							},
							{
								name: 'Google Docs',
								value: 'application/vnd.google-apps.document',
							},
							{
								name: 'Google Drawing',
								value: 'application/vnd.google-apps.drawing',
							},
							{
								name: 'Google Drive File',
								value: 'application/vnd.google-apps.file',
							},
							{
								name: 'Google Drive Folder',
								value: 'application/vnd.google-apps.folder',
							},
							{
								name: 'Google Forms',
								value: 'application/vnd.google-apps.form',
							},
							{
								name: 'Google Fusion Tables',
								value: 'application/vnd.google-apps.fusiontable',
							},
							{
								name: 'Google My Maps',
								value: 'application/vnd.google-apps.map',
							},
							{
								name: 'Google Sheets',
								value: 'application/vnd.google-apps.spreadsheet',
							},
							{
								name: 'Google Sites',
								value: 'application/vnd.google-apps.site',
							},
							{
								name: 'Google Slides',
								value: 'application/vnd.google-apps.presentation',
							},
							{
								name: 'Photo',
								value: 'application/vnd.google-apps.photo',
							},
							{
								name: 'Unknown',
								value: 'application/vnd.google-apps.unknown',
							},
							{
								name: 'Video',
								value: 'application/vnd.google-apps.video',
							},
						],
						default: 'application/vnd.google-apps.file',
						description: 'The Mime-Type of the files to return',
					},
					{
						displayName: 'Custom Mime Type',
						name: 'customMimeType',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								mimeType: ['custom'],
							},
						},
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['list'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
