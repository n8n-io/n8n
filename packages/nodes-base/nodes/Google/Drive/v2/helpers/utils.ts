import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

import type { Readable } from 'stream';
import { UPLOAD_CHUNK_SIZE } from './interfaces';

export function prepareQueryString(fields: string[] | undefined) {
	let queryFields = 'id, name';
	if (fields) {
		if (fields.includes('*')) {
			queryFields = '*';
		} else {
			queryFields = fields.join(', ');
		}
	}
	return queryFields;
}

export async function getItemBinaryData(
	this: IExecuteFunctions,
	inputDataFieldName: string,
	i: number,
	chunkSize = UPLOAD_CHUNK_SIZE,
) {
	let contentLength: number;
	let fileContent: Buffer | Readable;
	let originalFilename: string | undefined;
	let mimeType;

	if (!inputDataFieldName) {
		throw new NodeOperationError(
			this.getNode(),
			'The name of the input field containing the binary file data must be set',
			{
				itemIndex: i,
			},
		);
	}
	const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);

	if (binaryData.id) {
		// Stream data in 256KB chunks, and upload the via the resumable upload api
		fileContent = this.helpers.getBinaryStream(binaryData.id, chunkSize);
		const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
		contentLength = metadata.fileSize;
		originalFilename = metadata.fileName;
		if (metadata.mimeType) mimeType = binaryData.mimeType;
	} else {
		fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
		contentLength = fileContent.length;
		originalFilename = binaryData.fileName;
		mimeType = binaryData.mimeType;
	}

	return {
		contentLength,
		fileContent,
		originalFilename,
		mimeType,
	};
}

export function setFileProperties(body: IDataObject, options: IDataObject) {
	if (options.propertiesUi) {
		const values = ((options.propertiesUi as IDataObject).propertyValues as IDataObject[]) || [];

		body.properties = values.reduce(
			(acc, value) => Object.assign(acc, { [`${value.key}`]: value.value }),
			{} as IDataObject,
		);
	}

	if (options.appPropertiesUi) {
		const values =
			((options.appPropertiesUi as IDataObject).appPropertyValues as IDataObject[]) || [];

		body.appProperties = values.reduce(
			(acc, value) => Object.assign(acc, { [`${value.key}`]: value.value }),
			{} as IDataObject,
		);
	}

	return body;
}

export function setUpdateCommonParams(qs: IDataObject, options: IDataObject) {
	if (options.keepRevisionForever) {
		qs.keepRevisionForever = options.keepRevisionForever;
	}

	if (options.ocrLanguage) {
		qs.ocrLanguage = options.ocrLanguage;
	}

	if (options.useContentAsIndexableText) {
		qs.useContentAsIndexableText = options.useContentAsIndexableText;
	}

	return qs;
}
