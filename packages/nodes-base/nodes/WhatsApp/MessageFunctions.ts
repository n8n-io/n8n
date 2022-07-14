import set from 'lodash.set';
import { BinaryDataManager } from 'n8n-core';
import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	NodeOperationError,
} from 'n8n-workflow';

import FormData from 'form-data';

export async function addTemplateComponents(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const params = this.getNodeParameter('templateParameters') as IDataObject;
	if (!params?.parameter) {
		return requestOptions;
	}
	const components = [
		{
			type: 'body',
			parameters: params.parameter,
		},
	];
	if (!requestOptions.body) {
		requestOptions.body = {};
	}
	set(requestOptions.body as object, 'template.components', components);
	return requestOptions;
}

export async function mediaUploadFromItem(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const mediaPropertyName = this.getNodeParameter('mediaPropertyName') as string;
	if (this.getInputData().binary?.[mediaPropertyName] === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`The binary property "${mediaPropertyName}" does not exist. So no file can be written!`,
		);
	}
	const binaryFile = this.getInputData().binary![mediaPropertyName]!;
	const mediaFileName = (this.getNodeParameter('additionalFields') as IDataObject).mediaFilename as
		| string
		| undefined;
	const binaryFileName = binaryFile.fileName;
	if (!mediaFileName && !binaryFileName) {
		throw new NodeOperationError(this.getNode(), 'No file name given for media upload.');
	}
	const mimeType = binaryFile.mimeType;

	const data = new FormData();
	data.append('file', await BinaryDataManager.getInstance().retrieveBinaryData(binaryFile), {
		contentType: mimeType,
		filename: mediaFileName || binaryFileName,
	});
	data.append('messaging_product', 'whatsapp');

	const phoneNumberId = this.getNodeParameter('phoneNumberId') as string;

	const result = (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppApi', {
		url: `/${phoneNumberId}/media`,
		baseURL: requestOptions.baseURL,
		method: 'POST',
		body: data,
	})) as IDataObject;

	const operation = this.getNodeParameter('operation') as string;
	if (!requestOptions.body) {
		requestOptions.body = {};
	}
	set(requestOptions.body as object, `${operation}.id`, result.id);
	if (operation === 'document') {
		set(requestOptions.body as object, `${operation}.filename`, mediaFileName || binaryFileName);
	}

	return requestOptions;
}
