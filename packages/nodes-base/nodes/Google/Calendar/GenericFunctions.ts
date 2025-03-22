import { DateTime } from 'luxon';
import moment from 'moment-timezone';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	INodeListSearchItems,
	INodeListSearchResult,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';
import { RRule } from 'rrule';

import type { RecurringEventInstance } from './EventInterface';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
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
		return await this.helpers.requestOAuth2.call(this, 'googleCalendarOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
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

export type RecurrentEvent = {
	start: {
		date?: string;
		dateTime?: string;
		timeZone?: string;
	};
	end: {
		date?: string;
		dateTime?: string;
		timeZone?: string;
	};
	recurrence: string[];
	nextOccurrence?: {
		start: {
			dateTime: string;
			timeZone?: string;
		};
		end: {
			dateTime: string;
			timeZone?: string;
		};
	};
};

export function addNextOccurrence(items: RecurrentEvent[]) {
	for (const item of items) {
		if (item.recurrence) {
			let eventRecurrence;
			try {
				eventRecurrence = item.recurrence.find((r) => r.toUpperCase().startsWith('RRULE'));

				if (!eventRecurrence) continue;

				const start = moment(item.start.dateTime || item.end.date).utc();
				const end = moment(item.end.dateTime || item.end.date).utc();

				const rruleWithStartDate = `DTSTART:${start.format(
					'YYYYMMDDTHHmmss',
				)}Z\n${eventRecurrence}`;

				const rrule = RRule.fromString(rruleWithStartDate);

				const until = rrule.options?.until;

				const now = moment().utc();

				if (until && moment(until).isBefore(now)) {
					continue;
				}

				const nextDate = rrule.after(now.toDate(), false);

				if (nextDate) {
					const nextStart = moment(nextDate);

					const duration = moment.duration(moment(end).diff(moment(start)));
					const nextEnd = moment(nextStart).add(duration);

					item.nextOccurrence = {
						start: {
							dateTime: nextStart.format(),
							timeZone: item.start.timeZone,
						},
						end: {
							dateTime: nextEnd.format(),
							timeZone: item.end.timeZone,
						},
					};
				}
			} catch (error) {
				console.log(`Error adding next occurrence ${eventRecurrence}`);
			}
		}
	}
	return items;
}

const hasTimezone = (date: string) => date.endsWith('Z') || /\+\d{2}:\d{2}$/.test(date);

export function addTimezoneToDate(date: string, timezone: string) {
	if (hasTimezone(date)) return date;
	return moment.tz(date, timezone).utc().format();
}

async function requestWithRetries(
	node: INode,
	requestFn: () => Promise<any>,
	retryCount: number = 0,
	maxRetries: number = 10,
	itemIndex: number = 0,
): Promise<any> {
	try {
		return await requestFn();
	} catch (error) {
		if (!(error instanceof NodeApiError)) {
			throw new NodeOperationError(node, error.message, { itemIndex });
		}

		if (retryCount >= maxRetries) throw error;

		if (error.httpCode === '403' || error.httpCode === '429') {
			const delay = 1000 * Math.pow(2, retryCount);

			console.log(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`);

			await sleep(delay);
			return await requestWithRetries(node, requestFn, retryCount + 1, maxRetries, itemIndex);
		}

		throw error;
	}
}

export async function googleApiRequestWithRetries({
	context,
	method,
	resource,
	body = {},
	qs = {},
	uri,
	headers = {},
	itemIndex = 0,
}: {
	context: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;
	method: IHttpRequestMethods;
	resource: string;
	body?: any;
	qs?: IDataObject;
	uri?: string;
	headers?: IDataObject;
	itemIndex?: number;
}) {
	const requestFn = async (): Promise<any> => {
		return await googleApiRequest.call(context, method, resource, body, qs, uri, headers);
	};

	const retryCount = 0;
	const maxRetries = 10;

	return await requestWithRetries(context.getNode(), requestFn, retryCount, maxRetries, itemIndex);
}

export const eventExtendYearIntoFuture = (
	data: RecurringEventInstance[],
	timezone: string,
	currentYear?: number, // for testing purposes
) => {
	const thisYear = currentYear || moment().tz(timezone).year();

	return data.some((event) => {
		if (!event.recurringEventId) return false;

		const eventStart = event.start.dateTime || event.start.date;

		const eventDateTime = moment(eventStart).tz(timezone);
		if (!eventDateTime.isValid()) return false;

		const targetYear = eventDateTime.year();

		if (targetYear - thisYear >= 1) {
			return true;
		} else {
			return false;
		}
	});
};

export function dateObjectToISO<T>(date: T): string {
	if (date instanceof DateTime) return date.toISO();
	if (date instanceof Date) return date.toISOString();
	return date as string;
}
