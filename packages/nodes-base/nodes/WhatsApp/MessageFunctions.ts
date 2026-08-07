import set from 'lodash/set';
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

function normalizeTemplateParameter(parameter: IDataObject): IDataObject {
	if (parameter.type === 'text') {
		return {
			type: 'text',
			text: parameter.text,
		};
	}

	if (parameter.type === 'currency') {
		return {
			type: 'currency',
			currency: {
				code: parameter.code,
				fallback_value: parameter.fallback_value,
				amount_1000: Number(parameter.amount_1000) * 1000,
			},
		};
	}

	if (parameter.type === 'date_time') {
		return {
			type: 'date_time',
			date_time: {
				fallback_value: parameter.date_time,
			},
		};
	}

	if (parameter.type === 'image' || parameter.type === 'video' || parameter.type === 'document') {
		const linkField = `${parameter.type}Link`;
		return {
			type: parameter.type,
			[parameter.type]: {
				link: parameter[linkField],
			},
		};
	}

	if (parameter.type === 'payload') {
		return {
			type: 'payload',
			payload: parameter.payload,
		};
	}

	if (parameter.type === 'coupon_code') {
		return {
			type: 'coupon_code',
			coupon_code: parameter.coupon_code,
		};
	}

	if (parameter.type === 'action') {
		return {
			type: 'action',
			action: {
				flow_token: parameter.flowToken,
			},
		};
	}

	return parameter;
}

function formatErrorDescription(error: WhatsAppApiError['error'], statusCode: number, operation: string) {
	const details = [
		`Status code: ${statusCode}`,
		`Operation: ${operation}`,
		error.code ? `Error code: ${error.code}` : '',
		error.type ? `Error type: ${error.type}` : '',
		error.fbtrace_id ? `FB trace ID: ${error.fbtrace_id}` : '',
	]
		.filter(Boolean)
		.join(' | ');

	return `${error.message}${details ? `\n${details}` : ''}`;
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
	set(requestOptions.body as IDataObject, [operation, 'id'], result.id);
	if (operation === 'document') {
		set(requestOptions.body as IDataObject, [operation, 'filename'], uploadData.fileName);
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
			comp.parameters = (
				((component.bodyParameters as IDataObject).parameter as IDataObject[]) || []
			).map((i: IDataObject) => normalizeTemplateParameter(i));
		} else if (component.type === 'button') {
			comp.index = component.index?.toString();
			comp.sub_type = component.sub_type;
			comp.parameters = [
				normalizeTemplateParameter((component.buttonParameters as IDataObject).parameter as IDataObject),
			];
		} else if (component.type === 'header') {
			comp.parameters = (
				(component.headerParameters as IDataObject).parameter as IDataObject[]
			).map((i: IDataObject) => normalizeTemplateParameter(i));
		}
		componentsRet.push(comp);
	}

	if (!requestOptions.body) {
		requestOptions.body = {};
	}

	set(requestOptions.body as IDataObject, 'template.components', componentsRet);

	return requestOptions;
}

export const sanitizePhoneNumber = (phoneNumber: string) => phoneNumber.replace(/[\-\(\)\+]/g, '');

export async function cleanPhoneNumber(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const phoneNumber = sanitizePhoneNumber(this.getNodeParameter('recipientPhoneNumber') as string);

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
	const operation = this.getNodeParameter('operation', 'send') as string;

	if (response.statusCode === 500) {
		throw new NodeApiError(
			this.getNode(),
			response as unknown as JsonObject,
			{
				message: 'Sending failed',
				description:
					'If you are sending to a new test number, try sending a message to it from within the Meta developer portal first.\nStatus code: 500',
				httpCode: '500',
			},
		);
	} else if (response.statusCode === 400) {
		const apiError = (response.body as WhatsAppApiError | undefined)?.error;
		if (!apiError?.message) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
		}

		const error = { ...apiError };
		error.message = error.message.replace(/^\(#\d+\) /, '');
		const messageType = this.getNodeParameter('messageType', 'media');
		const description = formatErrorDescription(error, response.statusCode, operation);
		if (error.message.endsWith('is not a valid whatsapp business account media attachment ID')) {
			throw new NodeApiError(
				this.getNode(),
				{ ...(response as unknown as JsonObject), body: { error } },
				{
					message: `Invalid ${messageType} ID`,
					description,
					httpCode: '400',
				},
			);
		} else if (error.message.endsWith('is not a valid URI.')) {
			throw new NodeApiError(
				this.getNode(),
				{ ...(response as unknown as JsonObject), body: { error } },
				{
					message: `Invalid ${messageType} URL`,
					description,
					httpCode: '400',
				},
			);
		}
		throw new NodeApiError(
			this.getNode(),
			{ ...(response as unknown as JsonObject), body: { error } },
			{
				message: 'WhatsApp API request failed',
				description,
				httpCode: '400',
			},
		);
	} else if (response.statusCode > 399) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: 'WhatsApp API request failed',
			description: `Status code: ${response.statusCode} | Operation: ${operation}`,
			httpCode: `${response.statusCode}`,
		});
	}
	return data;
}
