import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import FormData from 'form-data';

export async function getUploadFormData(
	this: IExecuteSingleFunctions,
): Promise<{ fileName: string; formData: FormData }> {
	const mediaPropertyName = ((this.getNodeParameter('mediaPropertyName') as string) || '').trim();
	if (!mediaPropertyName)
		throw new NodeOperationError(this.getNode(), 'Parameter "mediaPropertyName" is not defined');

	const { binary: binaryData } = this.getInputData();
	if (!binaryData) throw new NodeOperationError(this.getNode(), 'Binary data missing in input');

	const binaryFile = binaryData[mediaPropertyName];
	if (binaryFile === undefined)
		throw new NodeOperationError(this.getNode(), 'Could not find file in node input data');

	const mediaFileName = (this.getNodeParameter('additionalFields') as IDataObject).mediaFileName as
		| string
		| undefined;

	const fileName = mediaFileName || binaryFile.fileName;
	if (!fileName)
		throw new NodeOperationError(this.getNode(), 'No file name given for media upload.');

	const buffer = await this.helpers.getBinaryDataBuffer(mediaPropertyName);

	const formData = new FormData();
	formData.append('file', buffer, { contentType: binaryFile.mimeType, filename: fileName });
	formData.append('messaging_product', 'whatsapp');

	return { fileName, formData };
}

export async function setupUpload(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const uploadData = await getUploadFormData.call(this);
	requestOptions.body = uploadData.formData;
	return requestOptions;
}
