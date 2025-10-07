import { DateTime } from 'luxon';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { RecurringEventInstance } from '../EventInterface';
import {
	addNextOccurrence,
	addTimezoneToDate,
	dateObjectToISO,
	encodeURIComponentOnce,
	eventExtendYearIntoFuture,
	getCalendars,
	getTimezones,
	googleApiRequest,
	googleApiRequestAllItems,
	googleApiRequestWithRetries,
} from '../GenericFunctions';

describe('addTimezoneToDate', () => {
	it('should add timezone to date', () => {
		const dateWithTimezone = '2021-09-01T12:00:00.000Z';
		const result1 = addTimezoneToDate(dateWithTimezone, 'Europe/Prague');
		expect(result1).toBe('2021-09-01T12:00:00.000Z');

		const dateWithoutTimezone = '2021-09-01T12:00:00';
		const result2 = addTimezoneToDate(dateWithoutTimezone, 'Europe/Prague');
		expect(result2).toBe('2021-09-01T10:00:00Z');

		const result3 = addTimezoneToDate(dateWithoutTimezone, 'Asia/Tokyo');
		expect(result3).toBe('2021-09-01T03:00:00Z');

		const dateWithDifferentTimezone = '2021-09-01T12:00:00.000+08:00';
		const result4 = addTimezoneToDate(dateWithDifferentTimezone, 'Europe/Prague');
		expect(result4).toBe('2021-09-01T12:00:00.000+08:00');
	});
});

describe('dateObjectToISO', () => {
	test('should return ISO string for DateTime instance', () => {
		const mockDateTime = DateTime.fromISO('2025-01-07T12:00:00');
		const result = dateObjectToISO(mockDateTime);
		expect(result).toBe('2025-01-07T12:00:00.000+00:00');
	});

	test('should return ISO string for Date instance', () => {
		const mockDate = new Date('2025-01-07T12:00:00Z');
		const result = dateObjectToISO(mockDate);
		expect(result).toBe('2025-01-07T12:00:00.000Z');
	});

	test('should return string when input is not a DateTime or Date instance', () => {
		const inputString = '2025-01-07T12:00:00';
		const result = dateObjectToISO(inputString);
		expect(result).toBe(inputString);
	});
});

describe('eventExtendYearIntoFuture', () => {
	const timezone = 'UTC';

	it('should return true if any event extends into the next year', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: '2026-01-01T00:00:00Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(true);
	});

	it('should return false if no event extends into the next year', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: '2025-12-31T23:59:59Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should return false for invalid event start dates', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: 'invalid-date', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should return false for events without a recurringEventId', () => {
		const events = [
			{
				recurringEventId: null,
				start: { dateTime: '2025-01-01T00:00:00Z', date: null },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(false);
	});

	it('should handle events with only a date and no time', () => {
		const events = [
			{
				recurringEventId: '123',
				start: { dateTime: null, date: '2026-01-01' },
			},
		] as unknown as RecurringEventInstance[];

		const result = eventExtendYearIntoFuture(events, timezone, 2025);
		expect(result).toBe(true);
	});
});

describe('googleApiRequest', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let requestOAuth2Spy: jest.SpyInstance;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = {
			id: 'test-node',
			name: 'Test Google Calendar Node',
			type: 'n8n-nodes-base.googleCalendar',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		requestOAuth2Spy = jest.spyOn(mockExecuteFunctions.helpers, 'requestOAuth2');
		jest.clearAllMocks();
	});

	it('should make a successful GET request with default parameters', async () => {
		const mockResponse = { id: 'test-calendar', summary: 'Test Calendar' };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			'/calendar/v3/users/me/calendarList',
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith('googleCalendarOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'GET',
			qs: {},
			uri: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
			json: true,
		});
		expect(result).toEqual(mockResponse);
	});

	it('should make a POST request with body data', async () => {
		const requestBody = { summary: 'New Calendar' };
		const mockResponse = { id: 'new-calendar-id', summary: 'New Calendar' };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'POST',
			'/calendar/v3/calendars',
			requestBody,
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith('googleCalendarOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: requestBody,
			qs: {},
			uri: 'https://www.googleapis.com/calendar/v3/calendars',
			json: true,
		});
		expect(result).toEqual(mockResponse);
	});

	it('should include query string parameters', async () => {
		const mockResponse = { items: [] };
		const queryParams = { maxResults: 10, orderBy: 'startTime' };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			'/calendar/v3/calendars/primary/events',
			{},
			queryParams,
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith(
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				qs: queryParams,
			}),
		);
	});

	it('should merge custom headers with default headers', async () => {
		const mockResponse = { success: true };
		const customHeaders = { 'X-Custom-Header': 'test-value', Authorization: 'Bearer test' };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequest.call(
			mockExecuteFunctions,
			'PUT',
			'/calendar/v3/calendars/test',
			{ summary: 'Updated' },
			{},
			undefined,
			customHeaders,
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith(
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				headers: {
					'Content-Type': 'application/json',
					'X-Custom-Header': 'test-value',
					Authorization: 'Bearer test',
				},
			}),
		);
	});

	it('should use custom URI when provided', async () => {
		const mockResponse = { success: true };
		const customUri = 'https://custom.googleapis.com/v1/test';
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			'/calendar/v3/test',
			{},
			{},
			customUri,
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith(
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				uri: customUri,
			}),
		);
	});

	it('should remove empty body from request', async () => {
		const mockResponse = { items: [] };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequest.call(mockExecuteFunctions, 'GET', '/calendar/v3/calendars', {});

		const callOptions = requestOAuth2Spy.mock.calls[0][1];
		expect(callOptions.body).toBeUndefined();
	});

	it('should throw NodeApiError when request fails', async () => {
		const originalError = new Error('API request failed');
		requestOAuth2Spy.mockRejectedValue(originalError);

		await expect(
			googleApiRequest.call(mockExecuteFunctions, 'GET', '/calendar/v3/calendars'),
		).rejects.toThrow(NodeApiError);
	});
});

describe('googleApiRequestAllItems', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let requestOAuth2Spy: jest.SpyInstance;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.googleCalendar',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		requestOAuth2Spy = jest.spyOn(mockExecuteFunctions.helpers, 'requestOAuth2');
		jest.clearAllMocks();
	});

	it('should fetch all items across multiple pages', async () => {
		const mockPage1 = {
			items: [
				{ id: '1', summary: 'Calendar 1' },
				{ id: '2', summary: 'Calendar 2' },
			],
			nextPageToken: 'token123',
		};
		const mockPage2 = {
			items: [{ id: '3', summary: 'Calendar 3' }],
			nextPageToken: '',
		};

		requestOAuth2Spy.mockResolvedValueOnce(mockPage1).mockResolvedValueOnce(mockPage2);

		const result = await googleApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/calendar/v3/users/me/calendarList',
		);

		expect(result).toEqual([
			{ id: '1', summary: 'Calendar 1' },
			{ id: '2', summary: 'Calendar 2' },
			{ id: '3', summary: 'Calendar 3' },
		]);

		expect(requestOAuth2Spy).toHaveBeenCalledTimes(2);
		expect(requestOAuth2Spy).toHaveBeenNthCalledWith(
			1,
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				qs: expect.objectContaining({ maxResults: 100 }),
			}),
		);
	});

	it('should handle single page response', async () => {
		const mockResponse = {
			items: [{ id: '1', summary: 'Calendar 1' }],
		};

		requestOAuth2Spy.mockResolvedValue(mockResponse);

		const result = await googleApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/calendar/v3/users/me/calendarList',
		);

		expect(result).toEqual([{ id: '1', summary: 'Calendar 1' }]);
		expect(requestOAuth2Spy).toHaveBeenCalledTimes(1);
	});

	it('should handle empty response', async () => {
		const mockResponse = {
			items: [],
		};

		requestOAuth2Spy.mockResolvedValue(mockResponse);

		const result = await googleApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/calendar/v3/users/me/calendarList',
		);

		expect(result).toEqual([]);
	});

	it('should pass through body and query parameters', async () => {
		const mockResponse = { items: [] };
		const body = { timeMin: '2023-01-01T00:00:00Z' };
		const query = { singleEvents: true };

		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/calendar/v3/calendars/primary/events',
			body,
			query,
		);

		expect(requestOAuth2Spy).toHaveBeenCalledWith(
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				body,
				qs: { ...query, maxResults: 100 },
			}),
		);
	});
});

describe('encodeURIComponentOnce', () => {
	it('should encode unencoded URI', () => {
		const uri = 'test calendar@example.com';
		const result = encodeURIComponentOnce(uri);
		expect(result).toBe('test%20calendar%40example.com');
	});

	it('should not double-encode already encoded URI', () => {
		const uri = 'test%20calendar%40example.com';
		const result = encodeURIComponentOnce(uri);
		expect(result).toBe('test%20calendar%40example.com');
	});

	it('should handle mixed encoded/unencoded URI', () => {
		const uri = 'test%20calendar@example.com';
		const result = encodeURIComponentOnce(uri);
		expect(result).toBe('test%20calendar%40example.com');
	});

	it('should handle special characters', () => {
		const uri = 'test+calendar&param=value';
		const result = encodeURIComponentOnce(uri);
		expect(result).toBe('test%2Bcalendar%26param%3Dvalue');
	});

	it('should handle empty string', () => {
		const uri = '';
		const result = encodeURIComponentOnce(uri);
		expect(result).toBe('');
	});
});

describe('getCalendars', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let requestOAuth2Spy: jest.SpyInstance;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockLoadOptionsFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.googleCalendar',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		requestOAuth2Spy = jest.spyOn(mockLoadOptionsFunctions.helpers, 'requestOAuth2');
		jest.clearAllMocks();
	});

	it('should return all calendars without filter', async () => {
		const mockCalendars = [
			{ id: 'cal1', summary: 'Personal Calendar' },
			{ id: 'cal2', summary: 'Work Calendar' },
			{ id: 'cal3', summary: 'Project Calendar' },
		];

		requestOAuth2Spy
			.mockResolvedValueOnce({ items: mockCalendars.slice(0, 2), nextPageToken: 'token' })
			.mockResolvedValueOnce({ items: mockCalendars.slice(2) });

		const result = await getCalendars.call(mockLoadOptionsFunctions);

		expect(result).toEqual({
			results: [
				{ name: 'Personal Calendar', value: 'cal1' },
				{ name: 'Project Calendar', value: 'cal3' },
				{ name: 'Work Calendar', value: 'cal2' },
			],
		});
	});

	it('should filter calendars by name', async () => {
		const mockCalendars = [
			{ id: 'cal1', summary: 'Personal Calendar' },
			{ id: 'cal2', summary: 'Work Calendar' },
			{ id: 'cal3', summary: 'Personal Tasks' },
		];

		requestOAuth2Spy.mockResolvedValue({
			items: mockCalendars,
		});

		const result = await getCalendars.call(mockLoadOptionsFunctions, 'personal');

		expect(result).toEqual({
			results: [
				{ name: 'Personal Calendar', value: 'cal1' },
				{ name: 'Personal Tasks', value: 'cal3' },
			],
		});
	});

	it('should filter calendars by exact ID match', async () => {
		const mockCalendars = [
			{ id: 'cal1', summary: 'Personal Calendar' },
			{ id: 'cal2', summary: 'Work Calendar' },
		];

		requestOAuth2Spy.mockResolvedValue({
			items: mockCalendars,
		});

		const result = await getCalendars.call(mockLoadOptionsFunctions, 'cal2');

		expect(result).toEqual({
			results: [{ name: 'Work Calendar', value: 'cal2' }],
		});
	});

	it('should sort calendars alphabetically', async () => {
		const mockCalendars = [
			{ id: 'cal1', summary: 'Zebra Calendar' },
			{ id: 'cal2', summary: 'Alpha Calendar' },
			{ id: 'cal3', summary: 'Beta Calendar' },
		];

		requestOAuth2Spy.mockResolvedValue({
			items: mockCalendars,
		});

		const result = await getCalendars.call(mockLoadOptionsFunctions);

		expect(result).toEqual({
			results: [
				{ name: 'Alpha Calendar', value: 'cal2' },
				{ name: 'Beta Calendar', value: 'cal3' },
				{ name: 'Zebra Calendar', value: 'cal1' },
			],
		});
	});

	it('should handle empty calendar list', async () => {
		requestOAuth2Spy.mockResolvedValue({
			items: [],
		});

		const result = await getCalendars.call(mockLoadOptionsFunctions);

		expect(result).toEqual({
			results: [],
		});
	});
});

describe('getTimezones', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
	});

	it('should return all timezones without filter', async () => {
		const result = await getTimezones.call(mockLoadOptionsFunctions);

		expect(result.results).toBeDefined();
		expect(result.results.length).toBeGreaterThan(0);
		expect(result.results).toContainEqual({ name: 'UTC', value: 'UTC' });
		expect(result.results).toContainEqual({ name: 'America/New_York', value: 'America/New_York' });
	});

	it('should filter timezones by name', async () => {
		const result = await getTimezones.call(mockLoadOptionsFunctions, 'america');

		expect(result.results).toBeDefined();
		expect(result.results.length).toBeGreaterThan(0);
		expect(result.results.every((tz) => tz.name.toLowerCase().includes('america'))).toBe(true);
		expect(result.results).toContainEqual({ name: 'America/New_York', value: 'America/New_York' });
	});

	it('should filter timezones by exact match', async () => {
		const result = await getTimezones.call(mockLoadOptionsFunctions, 'UTC');

		expect(result.results).toContainEqual({ name: 'UTC', value: 'UTC' });
		expect(result.results.length).toBeGreaterThan(0);
	});

	it('should return empty results for non-existent timezone', async () => {
		const result = await getTimezones.call(mockLoadOptionsFunctions, 'NonExistent/Timezone');

		expect(result.results).toEqual([]);
	});

	it('should handle case insensitive filtering', async () => {
		const result = await getTimezones.call(mockLoadOptionsFunctions, 'EUROPE/LONDON');

		expect(result.results.some((tz) => tz.value === 'Europe/London')).toBe(true);
	});
});

describe('addNextOccurrence', () => {
	it('should add next occurrence for recurring events', () => {
		const items = [
			{
				start: { dateTime: '2025-01-01T10:00:00Z', date: '2025-01-01' },
				end: { dateTime: '2025-01-01T11:00:00Z', date: '2025-01-01' },
				recurrence: ['RRULE:FREQ=DAILY;UNTIL=20251231T235959Z'],
			},
		];

		const result = addNextOccurrence(items);

		expect(result).toHaveLength(1);
		if (result[0].nextOccurrence) {
			expect(result[0].nextOccurrence.start.dateTime).toBeDefined();
			expect(result[0].nextOccurrence.end.dateTime).toBeDefined();
		}
	});

	it('should handle weekly recurring events', () => {
		const items = [
			{
				start: { dateTime: '2025-01-01T10:00:00Z', date: '2025-01-01' },
				end: { dateTime: '2025-01-01T11:00:00Z', date: '2025-01-01' },
				recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=SU;UNTIL=20251231T235959Z'],
			},
		];

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeDefined();
	});

	it('should handle events with end date (all-day events)', () => {
		const items = [
			{
				start: { date: '2025-01-01' },
				end: { date: '2025-01-02' },
				recurrence: ['RRULE:FREQ=MONTHLY;BYMONTHDAY=1;UNTIL=20251231T235959Z'],
			},
		];

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeDefined();
	});

	it('should preserve timezone information', () => {
		const items = [
			{
				start: {
					dateTime: '2025-01-01T10:00:00Z',
					date: '2025-01-01',
					timeZone: 'America/New_York',
				},
				end: { dateTime: '2025-01-01T11:00:00Z', date: '2025-01-01', timeZone: 'America/New_York' },
				recurrence: ['RRULE:FREQ=DAILY;UNTIL=20251231T235959Z'],
			},
		];

		const result = addNextOccurrence(items);

		if (result[0].nextOccurrence) {
			expect(result[0].nextOccurrence.start.timeZone).toBe('America/New_York');
			expect(result[0].nextOccurrence.end.timeZone).toBe('America/New_York');
		}
	});

	it('should skip events without RRULE', () => {
		const items = [
			{
				start: { dateTime: '2025-01-01T10:00:00Z' },
				end: { dateTime: '2025-01-01T11:00:00Z' },
				recurrence: ['EXDATE:20250102T100000Z'],
			},
		];

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should skip events with past UNTIL date', () => {
		const items = [
			{
				start: { dateTime: '2020-01-01T10:00:00Z' },
				end: { dateTime: '2020-01-01T11:00:00Z' },
				recurrence: ['RRULE:FREQ=DAILY;UNTIL=20201231T235959Z'],
			},
		];

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should handle events without recurrence', () => {
		const items = [
			{
				start: { dateTime: '2025-01-01T10:00:00Z' },
				end: { dateTime: '2025-01-01T11:00:00Z' },
				recurrence: [],
			},
		];

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeUndefined();
	});

	it('should handle invalid recurrence rules gracefully', () => {
		const items = [
			{
				start: { dateTime: '2025-01-01T10:00:00Z' },
				end: { dateTime: '2025-01-01T11:00:00Z' },
				recurrence: ['RRULE:INVALID_RULE'],
			},
		];

		const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

		const result = addNextOccurrence(items);

		expect(result[0].nextOccurrence).toBeUndefined();
		expect(consoleSpy).toHaveBeenCalledWith('Error adding next occurrence RRULE:INVALID_RULE');

		consoleSpy.mockRestore();
	});
});

describe('googleApiRequestWithRetries', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let requestOAuth2Spy: jest.SpyInstance;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.googleCalendar',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		requestOAuth2Spy = jest.spyOn(mockExecuteFunctions.helpers, 'requestOAuth2');
		jest.clearAllMocks();
	});

	it('should make successful request without retries', async () => {
		const mockResponse = { id: 'test-calendar' };
		requestOAuth2Spy.mockResolvedValue(mockResponse);

		const result = await googleApiRequestWithRetries({
			context: mockExecuteFunctions,
			method: 'GET',
			resource: '/calendar/v3/calendars/test',
		});

		expect(result).toEqual(mockResponse);
		expect(requestOAuth2Spy).toHaveBeenCalledTimes(1);
	});

	it('should retry on 429 rate limit error', async () => {
		const rateLimitError = new NodeApiError(mockNode, { message: 'Rate limit exceeded' });
		rateLimitError.httpCode = '429';

		const mockResponse = { id: 'test-calendar' };

		requestOAuth2Spy.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce(mockResponse);

		const result = await googleApiRequestWithRetries({
			context: mockExecuteFunctions,
			method: 'GET',
			resource: '/calendar/v3/calendars/test',
		});

		expect(result).toEqual(mockResponse);
		expect(requestOAuth2Spy).toHaveBeenCalledTimes(2);
	});

	it('should retry on 403 forbidden error', async () => {
		const forbiddenError = new NodeApiError(mockNode, { message: 'Forbidden' });
		forbiddenError.httpCode = '403';

		const mockResponse = { id: 'test-calendar' };

		requestOAuth2Spy.mockRejectedValueOnce(forbiddenError).mockResolvedValueOnce(mockResponse);

		const result = await googleApiRequestWithRetries({
			context: mockExecuteFunctions,
			method: 'GET',
			resource: '/calendar/v3/calendars/test',
		});

		expect(result).toEqual(mockResponse);
		expect(requestOAuth2Spy).toHaveBeenCalledTimes(2);
	});

	it('should not retry on non-retryable errors', async () => {
		const notFoundError = new NodeApiError(mockNode, { message: 'Not found' });
		notFoundError.httpCode = '404';

		requestOAuth2Spy.mockRejectedValue(notFoundError);

		await expect(
			googleApiRequestWithRetries({
				context: mockExecuteFunctions,
				method: 'GET',
				resource: '/calendar/v3/calendars/test',
			}),
		).rejects.toThrow(NodeApiError);

		expect(requestOAuth2Spy).toHaveBeenCalledTimes(1);
	});

	it('should throw NodeApiError for generic errors', async () => {
		// Mock a generic error - googleApiRequest will wrap it in NodeApiError
		const genericError = new Error('Generic error');
		requestOAuth2Spy.mockRejectedValue(genericError);

		await expect(
			googleApiRequestWithRetries({
				context: mockExecuteFunctions,
				method: 'GET',
				resource: '/calendar/v3/calendars/test',
				itemIndex: 5,
			}),
		).rejects.toThrow(NodeApiError);
	});

	it('should pass through request parameters', async () => {
		const mockResponse = { success: true };
		const body = { summary: 'Test Calendar' };
		const qs = { maxResults: 10 };
		const headers = { 'X-Custom': 'test' };
		const uri = 'https://custom.googleapis.com/test';

		requestOAuth2Spy.mockResolvedValue(mockResponse);

		await googleApiRequestWithRetries({
			context: mockExecuteFunctions,
			method: 'POST',
			resource: '/calendar/v3/calendars',
			body,
			qs,
			uri,
			headers,
			itemIndex: 2,
		});

		expect(requestOAuth2Spy).toHaveBeenCalledWith(
			'googleCalendarOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body,
				qs,
				uri,
				headers: expect.objectContaining(headers),
			}),
		);
	});
});
