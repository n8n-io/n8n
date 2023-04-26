import type { IExecuteFunctions } from 'n8n-workflow';
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
