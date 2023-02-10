import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import FormData from 'form-data';

export async function setupUpload(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const mediaPropertyName = this.getNodeParameter('mediaPropertyName') as string;
	if (!mediaPropertyName) {
		return requestOptions;
	}
	if (this.getInputData().binary?.[mediaPropertyName] === undefined || !mediaPropertyName.trim()) {
		throw new NodeOperationError(this.getNode(), 'Could not find file in node input data', {
			description: `There’s no key called '${mediaPropertyName}' with binary data in it`,
		});
	}
	const binaryFile = this.getInputData().binary![mediaPropertyName]!;
	const mediaFileName = (this.getNodeParameter('additionalFields') as IDataObject).mediaFileName as
		| string
		| undefined;
	const binaryFileName = binaryFile.fileName;
	if (!mediaFileName && !binaryFileName) {
		throw new NodeOperationError(this.getNode(), 'No file name given for media upload.');
	}
	const mimeType = binaryFile.mimeType;

	const buffer = await this.helpers.getBinaryDataBuffer(mediaPropertyName);

	const data = new FormData();
	data.append('file', buffer, {
		contentType: mimeType,
		filename: mediaFileName || binaryFileName,
	});
	data.append('messaging_product', 'whatsapp');

	requestOptions.body = data;
	return requestOptions;
}
