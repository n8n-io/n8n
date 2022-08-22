import {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodePropertyOptions,
	IPollFunctions,
	IWebhookFunctions,
	NodeApiError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

import { DateTime, ToISOTimeOptions } from 'luxon';

import moment from 'moment-timezone';

const VALID_EMAIL_REGEX =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const VALID_PHONE_REGEX =
	/((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/;

export function isEmailValid(email: string): boolean {
	return VALID_EMAIL_REGEX.test(String(email).toLowerCase());
}

export function isPhoneValid(phone: string): boolean {
	return VALID_PHONE_REGEX.test(String(phone));
}

export async function taskPostReceiceAction(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const contactId = this.getNodeParameter('contactId');
	items.forEach((item) => (item.json.contactId = contactId));
	return items;
}

export async function dueDatePreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const dueDateParam = this.getNodeParameter('dueDate') as string;
	if (!dueDateParam) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{ message: 'dueDate is required', description: 'dueDate is required' },
		);
	}
	const options: ToISOTimeOptions = { suppressMilliseconds: true };
	const dueDate = DateTime.fromISO(dueDateParam).toISO(options);
	requestOptions.body = (requestOptions.body || {}) as object;
	Object.assign(requestOptions.body, { dueDate });
	return requestOptions;
}

export async function contactIdentifierPreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = (requestOptions.body || {}) as object;
	let identifier = this.getNodeParameter('contactIdentifier', null) as string;
	if (!identifier) {
		const fields = this.getNodeParameter('additionalFields') as { contactIdentifier: string };
		identifier = fields.contactIdentifier;
	}
	if (isEmailValid(identifier)) {
		Object.assign(requestOptions.body, { email: identifier });
	} else if (isPhoneValid(identifier)) {
		Object.assign(requestOptions.body, { phone: identifier });
	} else {
		Object.assign(requestOptions.body, { contactId: identifier });
	}
	return requestOptions;
}

export async function validEmailAndPhonePreSendAction(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body || {}) as any;

	if (body.email && !isEmailValid(body.email)) {
		const message = `email "${body.email}" has invalid format`;
		throw new NodeApiError(this.getNode(), {}, { message, description: message });
	}

	if (body.phone && !isPhoneValid(body.phone)) {
		const message = `phone "${body.phone}" has invalid format`;
		throw new NodeApiError(this.getNode(), {}, { message, description: message });
	}

	return requestOptions;
}

export async function highLevelApiPagination(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const responseData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter('resource') as string;
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;

	const resourceMapping: { [key: string]: string } = {
		contact: 'contacts',
		opportunity: 'opportunities',
	};
	const rootProperty = resourceMapping[resource];

	requestData.options.qs = requestData.options.qs || {};
	if (returnAll) requestData.options.qs.limit = 100;

	let responseTotal = 0;

	do {
		const pageResponseData: INodeExecutionData[] = await this.makeRoutingRequest(requestData);
		const items = pageResponseData[0].json[rootProperty] as [];
		items.forEach((item) => responseData.push({ json: item }));

		const meta = pageResponseData[0].json.meta as IDataObject;
		const startAfterId = meta.startAfterId as string;
		const startAfter = meta.startAfter as number;
		requestData.options.qs = { startAfterId, startAfter };
		responseTotal = (meta.total as number) || 0;
	} while (returnAll && responseTotal > responseData.length);

	return responseData;
}

export async function highLevelApiRequest(
	this:
		| IExecuteFunctions
		| IWebhookFunctions
		| IPollFunctions
		| IHookFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: uri || `https://rest.gohighlevel.com/v1${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(qs).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'highLevelApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error, {
			message: error.message,
		});
	}
}

export async function getPipelineStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
	const responseData = await highLevelApiRequest.call(this, 'GET', '/pipelines');
	const pipelines = responseData.pipelines as [
		{ id: string; stages: [{ id: string; name: string }] },
	];
	const pipeline = pipelines.find((p) => p.id === pipelineId);
	if (pipeline) {
		const options: INodePropertyOptions[] = pipeline.stages.map((stage) => {
			const name = stage.name;
			const value = stage.id;
			return { name, value };
		});
		return options;
	}
	return [];
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const responseData = await highLevelApiRequest.call(this, 'GET', '/users');
	const users = responseData.users as [{ id: string; name: string; email: string }];
	const options: INodePropertyOptions[] = users.map((user) => {
		const name = user.name;
		const value = user.id;
		return { name, value };
	});
	return options;
}

export async function getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return (moment.tz.names() as string[]).map((zone) => ({
		name: zone,
		value: zone,
	})) as INodePropertyOptions[];
}
