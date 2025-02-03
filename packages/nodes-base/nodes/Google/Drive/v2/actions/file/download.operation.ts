import type {
	IExecuteFunctions,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { googleApiRequest } from '../../transport';
import { fileRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...fileRLC,
		description: 'The file to download',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				placeholder: 'e.g. data',
				default: 'data',
				description: 'Use this field name in the following nodes, to use the binary file data',
				hint: 'The name of the output binary field to put the file in',
			},
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
										name: 'HTML',
										value: 'text/html',
									},
									{
										name: 'MS Word Document',
										value:
											'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
									},
									{
										name: 'Open Office Document',
										value: 'application/vnd.oasis.opendocument.text',
									},
									{
										name: 'PDF',
										value: 'application/pdf',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Rich Text (rtf)',
										value: 'application/rtf',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Text (txt)',
										value: 'text/plain',
									},
								],
								default: 'text/html',
								description: 'Format used to export when downloading Google Docs files',
							},
							{
								displayName: 'Google Drawings',
								name: 'drawingsToFormat',
								type: 'options',
								options: [
									{
										name: 'JPEG',
										value: 'image/jpeg',
									},
									{
										name: 'PDF',
										value: 'application/pdf',
									},
									{
										name: 'PNG',
										value: 'image/png',
									},
									{
										name: 'SVG',
										value: 'image/svg+xml',
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
										name: 'MS PowerPoint',
										value:
											'application/vnd.openxmlformats-officedocument.presentationml.presentation',
									},
									{
										name: 'OpenOffice Presentation',
										value: 'application/vnd.oasis.opendocument.presentation',
									},
									{
										name: 'PDF',
										value: 'application/pdf',
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
										name: 'CSV',
										value: 'text/csv',
									},
									{
										name: 'MS Excel',
										value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
									},
									{
										name: 'Open Office Sheet',
										value: 'application/vnd.oasis.opendocument.spreadsheet',
									},
									{
										name: 'PDF',
										value: 'application/pdf',
									},
								],
								default: 'text/csv',
								description: 'Format used to export when downloading Google Sheets files',
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

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;

	const downloadOptions = this.getNodeParameter('options', i);

	const requestOptions = {
		useStream: true,
		returnFullResponse: true,
		encoding: 'arraybuffer',
		json: false,
	};

	const file = await googleApiRequest.call(
		this,
		'GET',
		`/drive/v3/files/${fileId}`,
		{},
		{ fields: 'mimeType,name', supportsTeamDrives: true, supportsAllDrives: true },
	);
	let response;

	if (file.mimeType?.includes('vnd.google-apps')) {
		const parameterKey = 'options.googleFileConversion.conversion';
		const type = file.mimeType.split('.')[2];
		let mime;
		if (type === 'document') {
			mime = this.getNodeParameter(
				`${parameterKey}.docsToFormat`,
				i,
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			) as string;
		} else if (type === 'presentation') {
			mime = this.getNodeParameter(
				`${parameterKey}.slidesToFormat`,
				i,
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			) as string;
		} else if (type === 'spreadsheet') {
			mime = this.getNodeParameter(
				`${parameterKey}.sheetsToFormat`,
				i,
				'application/x-vnd.oasis.opendocument.spreadsheet',
			) as string;
		} else {
			mime = this.getNodeParameter(`${parameterKey}.drawingsToFormat`, i, 'image/jpeg') as string;
		}
		response = await googleApiRequest.call(
			this,
			'GET',
			`/drive/v3/files/${fileId}/export`,
			{},
			{ mimeType: mime, supportsAllDrives: true },
			undefined,
			requestOptions,
		);
	} else {
		response = await googleApiRequest.call(
			this,
			'GET',
			`/drive/v3/files/${fileId}`,
			{},
			{ alt: 'media', supportsAllDrives: true },
			undefined,
			requestOptions,
		);
	}

	const mimeType =
		(response.headers as IDataObject)?.['content-type'] ?? file.mimeType ?? undefined;
	const fileName = downloadOptions.fileName ?? file.name ?? undefined;

	const newItem: INodeExecutionData = {
		json: item.json,
		binary: {},
	};

	if (item.binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		Object.assign(newItem.binary as IBinaryKeyData, item.binary);
	}

	item = newItem;

	const dataPropertyNameDownload = (downloadOptions.binaryPropertyName as string) || 'data';

	item.binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
		response.body as Buffer,
		fileName as string,
		mimeType as string,
	);

	const executionData = this.helpers.constructExecutionMetaData([item], { itemData: { item: i } });

	return executionData;
}
