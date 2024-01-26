import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import moment from 'moment-timezone';
import { RRule } from 'rrule';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleCalendarOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

export function encodeURIComponentOnce(uri: string) {
	// load options used to save encoded uri strings
	return encodeURIComponent(decodeURIComponent(uri));
}

export async function getCalendars(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const calendars = (await googleApiRequestAllItems.call(
		this,
		'items',
		'GET',
		'/calendar/v3/users/me/calendarList',
	)) as Array<{ id: string; summary: string }>;

	const results: INodeListSearchItems[] = calendars
		.map((c) => ({
			name: c.summary,
			value: c.id,
		}))
		.filter(
			(c) =>
				!filter ||
				c.name.toLowerCase().includes(filter.toLowerCase()) ||
				c.value?.toString() === filter,
		)
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});
	return { results };
}

export const TIMEZONE_VALIDATION_REGEX = `(${moment.tz
	.names()
	.map((t) => t.replace('+', '\\+'))
	.join('|')})[ \t]*`;

export async function getTimezones(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const results: INodeListSearchItems[] = moment.tz
		.names()
		.map((timezone) => ({
			name: timezone,
			value: timezone,
		}))
		.filter(
			(c) =>
				!filter ||
				c.name.toLowerCase().includes(filter.toLowerCase()) ||
				c.value?.toString() === filter,
		);
	return { results };
}

type RecurentEvent = {
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	recurrence: string[];
	nextOccurrence?: {
		start: {
			dateTime: string;
			timeZone: string;
		};
		end: {
			dateTime: string;
			timeZone: string;
		};
	};
};

export function addNextOccurrence(items: RecurentEvent[]) {
	for (const item of items) {
		if (item.recurrence) {
			const rrule = RRule.fromString(item.recurrence[0]);
			const until = rrule.options?.until;

			const now = new Date();
			if (until && until < now) {
				continue;
			}

			const nextOccurrence = rrule.after(new Date());
			item.nextOccurrence = {
				start: {
					dateTime: moment(nextOccurrence).format(),
					timeZone: item.start.timeZone,
				},
				end: {
					dateTime: moment(nextOccurrence)
						.add(moment(item.end.dateTime).diff(moment(item.start.dateTime)))
						.format(),
					timeZone: item.end.timeZone,
				},
			};
		}
	}
	return items;
}
