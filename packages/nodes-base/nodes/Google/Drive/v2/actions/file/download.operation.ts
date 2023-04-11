import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['file'],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Google File Conversion',
				name: 'googleFileConversion',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				placeholder: 'Add Conversion',
				options: [
					{
						displayName: 'Conversion',
						name: 'conversion',
						values: [
							{
								displayName: 'Google Docs',
								name: 'docsToFormat',
								type: 'options',
								options: [
									{
										name: 'To HTML',
										value: 'text/html',
									},
									{
										name: 'To MS Word',
										value:
											'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
									},
									{
										name: 'To OpenOffice Doc',
										value: 'application/vnd.oasis.opendocument.text',
									},
									{
										name: 'To PDF',
										value: 'application/pdf',
									},
									{
										name: 'To Rich Text',
										value: 'application/rtf',
									},
								],
								default: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
								description: 'Format used to export when downloading Google Docs files',
							},
							{
								displayName: 'Google Drawings',
								name: 'drawingsToFormat',
								type: 'options',
								options: [
									{
										name: 'To JPEG',
										value: 'image/jpeg',
									},
									{
										name: 'To PNG',
										value: 'image/png',
									},
									{
										name: 'To SVG',
										value: 'image/svg+xml',
									},
									{
										name: 'To PDF',
										value: 'application/pdf',
									},
								],
								default: 'image/jpeg',
								description: 'Format used to export when downloading Google Drawings files',
							},
							{
								displayName: 'Google Slides',
								name: 'slidesToFormat',
								type: 'options',
								options: [
									{
										name: 'To MS PowerPoint',
										value:
											'application/vnd.openxmlformats-officedocument.presentationml.presentation',
									},
									{
										name: 'To PDF',
										value: 'application/pdf',
									},
									{
										name: 'To OpenOffice Presentation',
										value: 'application/vnd.oasis.opendocument.presentation',
									},
									{
										name: 'To Plain Text',
										value: 'text/plain',
									},
								],
								default:
									'application/vnd.openxmlformats-officedocument.presentationml.presentation',
								description: 'Format used to export when downloading Google Slides files',
							},
							{
								displayName: 'Google Sheets',
								name: 'sheetsToFormat',
								type: 'options',
								options: [
									{
										name: 'To MS Excel',
										value: 'application/x-vnd.oasis.opendocument.spreadsheet',
									},
									{
										name: 'To PDF',
										value: 'application/pdf',
									},
									{
										name: 'To CSV',
										value: 'text/csv',
									},
								],
								default: 'application/x-vnd.oasis.opendocument.spreadsheet',
								description: 'Format used to export when downloading Google Spreadsheets files',
							},
						],
					},
				],
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'File name. Ex: data.pdf.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['download'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
