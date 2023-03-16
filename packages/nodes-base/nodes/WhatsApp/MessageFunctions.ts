import set from 'lodash.set';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getUploadFormData } from './MediaFunctions';

interface WhatsAppApiError {
	error: {
		message: string;
		type: string;
		code: number;
		fbtrace_id: string;
	};
}

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
	set(requestOptions.body as IDataObject, 'template.components', components);
	return requestOptions;
}

export async function setType(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
	const operation = this.getNodeParameter('operation') as string;
	const messageType = this.getNodeParameter('messageType', null) as string | null;
	let actualType = messageType;

	if (operation === 'sendTemplate') {
		actualType = 'template';
	}

	if (requestOptions.body) {
		Object.assign(requestOptions.body, { type: actualType });
	}

	return requestOptions;
}

export async function mediaUploadFromItem(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const uploadData = await getUploadFormData.call(this);

	const phoneNumberId = this.getNodeParameter('phoneNumberId') as string;

	const result = (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppApi', {
		url: `/${phoneNumberId}/media`,
		baseURL: requestOptions.baseURL,
		method: 'POST',
		body: uploadData.formData,
	})) as IDataObject;

	const operation = this.getNodeParameter('messageType') as string;
	if (!requestOptions.body) {
		requestOptions.body = {};
	}
	set(requestOptions.body as IDataObject, `${operation}.id`, result.id);
	if (operation === 'document') {
		set(requestOptions.body as IDataObject, `${operation}.filename`, uploadData.fileName);
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
	set(requestOptions.body as IDataObject, 'template.name', name);
	set(requestOptions.body as IDataObject, 'template.language.code', language);
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

	set(requestOptions.body as IDataObject, 'template.components', componentsRet);

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

	set(requestOptions.body as IDataObject, 'to', phoneNumber);

	return requestOptions;
}

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode === 500) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Sending failed',
				description:
					'If you’re sending to a new test number, try sending a message to it from within the Meta developer portal first.',
				httpCode: '500',
			},
		);
	} else if (response.statusCode === 400) {
		const error = { ...(response.body as WhatsAppApiError).error };
		error.message = error.message.replace(/^\(#\d+\) /, '');
		const messageType = this.getNodeParameter('messageType', 'media');
		if (error.message.endsWith('is not a valid whatsapp business account media attachment ID')) {
			throw new NodeApiError(
				this.getNode(),
				{ error },
				{
					message: `Invalid ${messageType} ID`,
					description: error.message,
					httpCode: '400',
				},
			);
		} else if (error.message.endsWith('is not a valid URI.')) {
			throw new NodeApiError(
				this.getNode(),
				{ error },
				{
					message: `Invalid ${messageType} URL`,
					description: error.message,
					httpCode: '400',
				},
			);
		}
		throw new NodeApiError(
			this.getNode(),
			{ ...(response as unknown as JsonObject), body: { error } },
			{},
		);
	} else if (response.statusCode > 399) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}
