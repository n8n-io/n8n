import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { WhatsAppAppWebhookSubscriptionsResponse, WhatsAppAppWebhookSubscription } from './types';

export async function whatsAppApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
		},
		method,
		qs,
		body,
		gzip: true,
		uri: `https://graph.facebook.com/v19.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.requestOAuth2.call(this, 'whatsAppOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error?.error?.error?.message,
		});
	}
}

export async function appAccessTokenRead(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
): Promise<{ access_token: string }> {
	const credentials = await this.getCredentials('whatsAppOAuth2Api');

	const options: IRequestOptions = {
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: 'client_credentials',
		},
		uri: credentials.accessTokenUrl as string,
		json: true,
	};
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function whatsAppAppApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: { type: 'json'; payload: IDataObject } | { type: 'form'; payload: IDataObject },
	qs: IDataObject = {},
): Promise<any> {
	const tokenResponse = await appAccessTokenRead.call(this);
	const appAccessToken = tokenResponse.access_token;

	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${appAccessToken}`,
		},
		method,
		qs,
		gzip: true,
		uri: `https://graph.facebook.com/v19.0${resource}`,
		json: true,
	};

	if (body?.type === 'json') {
		options.body = body.payload;
	} else if (body?.type === 'form') {
		options.form = body.payload;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function appWebhookSubscriptionList(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
): Promise<WhatsAppAppWebhookSubscription[]> {
	const response = (await whatsAppAppApiRequest.call(
		this,
		'GET',
		`/${appId}/subscriptions`,
	)) as WhatsAppAppWebhookSubscriptionsResponse;
	return response.data;
}

export async function appWebhookSubscriptionCreate(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	subscription: IDataObject,
) {
	return await whatsAppAppApiRequest.call(this, 'POST', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { ...subscription },
	});
}

export async function appWebhookSubscriptionDelete(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	object: string,
) {
	return await whatsAppAppApiRequest.call(this, 'DELETE', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { object },
	});
}
