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
	set(requestOptions.body as {}, 'template.components', components);
	return requestOptions;
}

export async function setType(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
	const operation = this.getNodeParameter('operation') as string;
	const messageType = this.getNodeParameter('messageType') as string | undefined;
	let actualType = messageType;

	if (operation === 'sendTemplate') {
		actualType = 'template';
	}

	Object.assign(requestOptions.body, { type: actualType });

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
	set(requestOptions.body as {}, `${operation}.id`, result.id);
	if (operation === 'document') {
		set(requestOptions.body as {}, `${operation}.filename`, mediaFileName || binaryFileName);
	}

	return requestOptions;
}

export async function templateInfo(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const template = this.getNodeParameter('template') as string;
	const [name, language] = template.split('|');
	if (!requestOptions.body) {
		requestOptions.body = {};
	}
	set(requestOptions.body as {}, 'template.name', name);
	set(requestOptions.body as {}, 'template.language.code', language);
	return requestOptions;
}

export async function componentsRequest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const components = this.getNodeParameter('components') as IDataObject;
	const componentsRet: object[] = [];

	if (!components?.component) {
		return requestOptions;
	}

	for (const component of components.component as IDataObject[]) {
		const comp: IDataObject = {
			type: component.type,
		};

		if (component.type === 'body') {
			comp.parameters = (((component.bodyParameters as IDataObject)!.parameter as IDataObject[]) ||
				[])!.map((i: IDataObject) => {
				if (i.type === 'text') {
					return i;
				} else if (i.type === 'currency') {
					return {
						type: 'currency',
						currency: {
							code: i.code,
							fallback_value: i.fallback_value,
							amount_1000: (i.amount_1000 as number) * 1000,
						},
					};
				} else if (i.type === 'date_time') {
					return {
						type: 'date_time',
						date_time: {
							fallback_value: i.date_time,
						},
					};
				}
			});
		} else if (component.type === 'button') {
			comp.index = component.index?.toString();
			comp.sub_type = component.sub_type;
			comp.parameters = [(component.buttonParameters as IDataObject).parameter];
		} else if (component.type === 'header') {
			comp.parameters = (
				(component.headerParameters as IDataObject).parameter as IDataObject[]
			).map((i: IDataObject) => {
				if (i.type === 'image') {
					return {
						type: 'image',
						image: {
							link: i.imageLink,
						},
					};
				}
				return i;
			});
		}
		componentsRet.push(comp);
	}

	if (!requestOptions.body) {
		requestOptions.body = {};
	}

	set(requestOptions.body as {}, 'template.components', componentsRet);

	return requestOptions;
}

export async function cleanPhoneNumber(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let phoneNumber = this.getNodeParameter('recipientPhoneNumber') as string;
	phoneNumber = phoneNumber.replace(/[\-\(\)\+]/g, '');

	if (!requestOptions.body) {
		requestOptions.body = {};
	}

	set(requestOptions.body as {}, 'to', phoneNumber);

	return requestOptions;
}
