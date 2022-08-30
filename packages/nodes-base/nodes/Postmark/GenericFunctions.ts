import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function postmarkApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('postmarkApi');

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'X-Postmark-Server-Token': credentials.serverToken,
		},
		method,
		body,
		uri: 'https://api.postmarkapp.com' + endpoint,
		json: true,
	};
	if (body === {}) {
		delete options.body;
	}
	options = Object.assign({}, options, option);

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// tslint:disable-next-line: no-any
export function convertTriggerObjectToStringArray(webhookObject: any): string[] {
	const triggers = webhookObject.Triggers;
	const webhookEvents: string[] = [];

	// Translate Webhook trigger settings to string array
	if (triggers.Open.Enabled) {
		webhookEvents.push('open');
	}
	if (triggers.Open.PostFirstOpenOnly) {
		webhookEvents.push('firstOpen');
	}
	if (triggers.Click.Enabled) {
		webhookEvents.push('click');
	}
	if (triggers.Delivery.Enabled) {
		webhookEvents.push('delivery');
	}
	if (triggers.Bounce.Enabled) {
		webhookEvents.push('bounce');
	}
	if (triggers.Bounce.IncludeContent) {
		webhookEvents.push('includeContent');
	}
	if (triggers.SpamComplaint.Enabled) {
		webhookEvents.push('spamComplaint');
	}
	if (triggers.SpamComplaint.IncludeContent) {
		if (!webhookEvents.includes('IncludeContent')) {
			webhookEvents.push('includeContent');
		}
	}
	if (triggers.SubscriptionChange.Enabled) {
		webhookEvents.push('subscriptionChange');
	}

	return webhookEvents;
}

export function eventExists(currentEvents: string[], webhookEvents: string[]) {
	for (const currentEvent of currentEvents) {
		if (!webhookEvents.includes(currentEvent)) {
			return false;
		}
	}
	return true;
}
