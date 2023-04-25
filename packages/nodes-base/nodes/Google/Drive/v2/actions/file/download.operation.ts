import type { IExecuteFunctions } from 'n8n-core';
import type {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				placeholder: 'e.g. data',
				default: 'data',
				description: 'Use this field name in the following nodes, to use the binary file data',
				hint: 'The name of the output field to put the binary file data in',
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

export async function execute(
	this: IExecuteFunctions,
	i: number,
	options: IDataObject,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, undefined, {
		extractValue: true,
	}) as string;

	const downloadOptions = this.getNodeParameter('options', i);

	const requestOptions = {
		useStream: true,
		resolveWithFullResponse: true,
		encoding: null,
		json: false,
	};

	const file = await googleApiRequest.call(
		this,
		'GET',
		`/drive/v3/files/${fileId}`,
		{},
		{ fields: 'mimeType,name', supportsTeamDrives: true },
	);
	let response;

	if (file.mimeType.includes('vnd.google-apps')) {
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
			{ mimeType: mime },
			undefined,
			requestOptions,
		);
	} else {
		response = await googleApiRequest.call(
			this,
			'GET',
			`/drive/v3/files/${fileId}`,
			{},
			{ alt: 'media' },
			undefined,
			requestOptions,
		);
	}

	const mimeType = response.headers['content-type'] ?? file.mimeType ?? undefined;
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
