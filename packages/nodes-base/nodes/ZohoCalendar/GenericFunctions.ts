import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	LoadedLayoutscalendar,
	LoadedLayoutsevent,
	ZohoCalendarOAuth2ApiCredentials,
} from './types';
import { log } from 'console';

export function throwOnErrorStatus(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	responseData: {
		error?: Array<{ description: string; message: string }>;
	},
) {
	if (responseData.error?.[0].description) {
		throw new NodeOperationError(this.getNode(), responseData as Error);
	}
}

export async function zohoCalendarApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
) {
	const { oauthTokenData } =
		await this.getCredentials<ZohoCalendarOAuth2ApiCredentials>('zohoCalendarOAuth2Api');
	const options: IRequestOptions = {
		body: {
			data: [body],
		},
		method,
		qs,
		uri: `https://calendar.${getDomain(oauthTokenData.api_domain)}/${endpoint}`,
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
			'zohoCalendarOAuth2Api',
			options,
		);
		if (responseData === undefined) return [];
		throwOnErrorStatus.call(this, responseData as IDataObject);

		return responseData;
	} catch (error) {
		error = error as JsonObject;
		const args = error
			? {
					message: error.error.error[0].message || 'The Zoho Calendar API returned an error.',
					description: JSON.stringify(error.error.error[0].description),
				}
			: undefined;
		throw new NodeApiError(this.getNode(), error as JsonObject, args);
	}
}

export async function getPicklistCalendarOptions(this: ILoadOptionsFunctions) {
	const responseData = (await zohoCalendarApiRequest.call(
		this,
		'GET',
		'api/v1/calendars',
		{},
	)) as LoadedLayoutscalendar;

	const pickListOptions = responseData.calendars;

	if (!pickListOptions) return [];

	return pickListOptions.map((option) => ({
		name: option.name,
		value: option.uid,
	}));
}

export async function getPicklistEventOptions(this: ILoadOptionsFunctions, targetField: string) {
	const responseData = (await zohoCalendarApiRequest.call(
		this,
		'GET',
		`api/v1/calendars/${targetField}/events`,
		{},
	)) as LoadedLayoutsevent;

	const pickListOptions = responseData.events;

	if (!pickListOptions) return [];

	return pickListOptions.map((option) => ({
		name: option.title,
		value: option.uid,
	}));
}

export function getDateAndTime(date: any) {
	return date.split('T')[0];
}

export function datesplit(date: any): string {
	let dateTimeParts = date.split('T');
	let datePart = dateTimeParts[0].replace(/-/g, '');
	let timePart = dateTimeParts[1].replace(/:/g, '');
	return datePart + 'T' + timePart + 'Z';
}

export function getAttendeesList(attendees: any): string {
	attendees = attendees.toString().trim();
	const emailList = attendees.split(',').map((email: string) => {
		return { email: email.trim() };
	});
	return JSON.stringify(emailList);
}

export async function getEventDetails(this: IExecuteFunctions, calendar: any, event: any) {
	const responseData = await zohoCalendarApiRequest.call(
		this,
		'GET',
		`api/v1/calendars/${calendar}/events/${event}`,
		{},
	);
	const etag = responseData.events[0]?.etag;
	if (etag) {
		return etag.toString();
	} else {
		throw new Error('Etag not found in events data.');
	}
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
			log(key);
			return value[key];
		}
	}
	return undefined;
}
