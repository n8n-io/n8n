import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type {
	WhatsAppAppWebhookSubscriptionsResponse,
	WhatsAppAppWebhookSubscription,
} from './types';

async function appAccessTokenRead(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
): Promise<{ access_token: string }> {
	const credentials = await this.getCredentials('whatsAppTriggerApi');

	const options: IHttpRequestOptions = {
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		body: {
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: 'client_credentials',
		},
		url: 'https://graph.facebook.com/v19.0/oauth/access_token',
		json: true,
	};
	try {
		return await this.helpers.httpRequest.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

async function whatsappApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: { type: 'json'; payload: IDataObject } | { type: 'form'; payload: IDataObject },
	qs: IDataObject = {},
): Promise<any> {
	const tokenResponse = await appAccessTokenRead.call(this);
	const appAccessToken = tokenResponse.access_token;

	const options: IHttpRequestOptions = {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${appAccessToken}`,
		},
		method,
		qs,
		body: body?.payload,
		url: `https://graph.facebook.com/v19.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.httpRequest.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function appWebhookSubscriptionList(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
): Promise<WhatsAppAppWebhookSubscription[]> {
	const response = (await whatsappApiRequest.call(
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
	return await whatsappApiRequest.call(this, 'POST', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { ...subscription },
	});
}

export async function appWebhookSubscriptionDelete(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	object: string,
) {
	return await whatsappApiRequest.call(this, 'DELETE', `/${appId}/subscriptions`, {
		type: 'form',
		payload: { object },
	});
}
