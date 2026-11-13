import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

import type {
	WhatsAppAppWebhookSubscriptionsResponse,
	WhatsAppAppWebhookSubscription,
} from './types';
import type { SendAndWaitConfig } from '../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../utils/utilities';
export const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v13.0/';

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
	resource: RequestPath,
	body?: { type: 'json'; payload: IDataObject } | { type: 'form'; payload: IDataObject },
	qs: IDataObject = {},
): Promise<any> {
	const tokenResponse = await appAccessTokenRead.call(this);
	const appAccessToken = tokenResponse.access_token;

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${appAccessToken}`,
		},
		method,
		qs,
		body: body?.payload,
		url: requestUrl`https://graph.facebook.com/v19.0${resource}`,
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
		requestPath`/${appId}/subscriptions`,
	)) as WhatsAppAppWebhookSubscriptionsResponse;
	return response.data;
}

export async function appWebhookSubscriptionCreate(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	subscription: IDataObject,
) {
	return await whatsappApiRequest.call(this, 'POST', requestPath`/${appId}/subscriptions`, {
		type: 'form',
		payload: { ...subscription },
	});
}

export async function appWebhookSubscriptionDelete(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	appId: string,
	object: string,
) {
	return await whatsappApiRequest.call(this, 'DELETE', requestPath`/${appId}/subscriptions`, {
		type: 'form',
		payload: { object },
	});
}

export const createMessage = (
	sendAndWaitConfig: SendAndWaitConfig,
	phoneNumberId: string,
	recipientPhoneNumber: string,
	instanceId: string,
): WithRequestTarget<IHttpRequestOptions> => {
	const buttons = sendAndWaitConfig.options.map((option) => {
		return `*${option.label}:*\n_${option.url}_\n\n`;
	});

	let n8nAttribution: string = '';
	if (sendAndWaitConfig.appendAttribution) {
		const attributionText = 'This message was sent automatically with ';
		const link = createUtmCampaignLink('n8n-nodes-base.whatsapp', instanceId);
		n8nAttribution = `\n\n${attributionText}${link}`;
	}

	return {
		baseURL: WHATSAPP_BASE_URL,
		method: 'POST',
		url: requestPath`${phoneNumberId}/messages`,
		body: {
			messaging_product: 'whatsapp',
			text: {
				body: `${sendAndWaitConfig.message}\n\n${buttons.join('')}${n8nAttribution}`,
			},
			type: 'text',
			to: recipientPhoneNumber,
		},
	};
};
