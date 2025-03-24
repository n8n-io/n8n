import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import {
	ZohoZeptomailOAuth2ApiCredentials,
	LoadedLayoutsMailagent,
	LoadedLayoutsTemplate,
} from './type';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	responseData: IDataObject,
) {
	if (
		(
			responseData as {
				error?: {
					details: Array<{ code: string; message: string }>;
					message: string;
					code: string;
				};
			}
		).error
	) {
		const error = (
			responseData as {
				error: { details: Array<{ code: string; message: string }>; message: string; code: string };
			}
		).error;
		if (error.details && error.details.length > 0) {
			const errorMessage = error.details[0].message;
			if (errorMessage) {
				throw new NodeOperationError(this.getNode(), new Error(errorMessage));
			}
		}
	}
}
export async function zohoZeptomailApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
	const { oauthTokenData } =
		await this.getCredentials<ZohoZeptomailOAuth2ApiCredentials>('zohoZeptomailOAuth2Api');
	const options: IRequestOptions = {
		body: body,
		method,
		qs,
		uri: `https://zeptomail.${getDomain(oauthTokenData.api_domain)}/${endpoint}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}
	try {
		const responseData = await this.helpers.requestOAuth2?.call(
			this,
			'zohoZeptomailOAuth2Api',
			options,
		);
		if (responseData === undefined) return [];
		throwOnErrorStatus.call(this, responseData as IDataObject);
		return responseData;
	} catch (error) {
		const args = error
			? {
					message: error.error.error.message || 'The Zoho ZeptoMail API returned an error.',
					description: JSON.stringify(error.error.error.details[0].message),
				}
			: undefined;
		throw new NodeApiError(this.getNode(), error as JsonObject, args);
	}
}

export async function getPicklistMailagentOptions(this: ILoadOptionsFunctions) {
	const responseData = (await zohoZeptomailApiRequest.call(
		this,
		'GET',
		'portal/v1.0/mailagents',
		{},
	)) as LoadedLayoutsMailagent;

	const pickListOptions = responseData.data;

	if (!pickListOptions) return [];

	return pickListOptions.map((option) => ({
		name: option.mailagent_name,
		value: option.mailagent_key,
	}));
}

export async function getPicklistTemplateOptions(this: ILoadOptionsFunctions, targetField: string) {
	const responseData = (await zohoZeptomailApiRequest.call(
		this,
		'GET',
		`portal/v1.0/mailagents/${targetField}/template`,
		{},
	)) as LoadedLayoutsTemplate;

	const pickListOptions = responseData.data[0].data;

	if (!pickListOptions) return [];

	return pickListOptions.map((option) => ({
		name: option.template_name,
		value: option.template_key,
	}));
}

export function getDomain(domain: string): string | undefined {
	const value: { [key: string]: string } = {
		'.com': 'zoho.com',
		'.eu': 'zoho.eu',
		'.com.cn': 'zoho.com.cn',
		'.com.au': 'zoho.com.au',
		'.in': 'zoho.in',
		'.ca': 'zohocloud.ca',
		'.sa': 'zoho.sa',
		'.jp': 'zoho.jp',
	};
	const suffixes = new Set(Object.keys(value));
	for (const key of suffixes) {
		if (domain.endsWith(key)) {
			return value[key];
		}
	}
	return undefined;
}

export function getRecipientAddresses(address: any): string {
	if (address === undefined || address === null || address === '') {
		return '';
	}
	address = address.toString().trim();
	const addresss: { email_address: { address: string } }[] = [];
	address.split(',').forEach((email: string) => {
		addresss.push({ email_address: { address: email.trim() } });
	});
	return JSON.stringify(addresss);
}

export function getReplyToAddresses(address: any): string {
	if (address === undefined || address === null || address === '') {
		return '';
	}
	address = address.toString().trim();
	const addresss: { address: string }[] = [];
	address.split(',').forEach((email: string) => {
		addresss.push({ address: email.trim() });
	});
	return JSON.stringify(addresss);
}
