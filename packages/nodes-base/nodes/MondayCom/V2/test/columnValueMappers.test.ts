import { describe, expect, it } from 'vitest';

import {
	buildColumnValues,
	mapColumnValue,
	READ_ONLY_COLUMN_TYPES,
} from '../helpers/columnValueMappers';

describe('mapColumnValue', () => {
	it('clears the column for null/undefined/empty values', () => {
		expect(mapColumnValue('status', null)).toBeNull();
		expect(mapColumnValue('text', undefined)).toBeNull();
		expect(mapColumnValue('numbers', '')).toBeNull();
	});

	it('passes JSON-object strings through as parsed API format', () => {
		expect(mapColumnValue('status', '{"index": 2}')).toEqual({ index: 2 });
	});

	it('keeps JSON-looking strings as text for text columns', () => {
		expect(mapColumnValue('text', '{"a": 1}')).toBe('{"a": 1}');
		expect(mapColumnValue('long_text', '{not json')).toEqual({ text: '{not json' });
	});

	it('passes objects through untouched', () => {
		expect(mapColumnValue('timeline', { from: '2026-01-01', to: '2026-01-31' })).toEqual({
			from: '2026-01-01',
			to: '2026-01-31',
		});
	});

	it('maps status labels and numeric indexes', () => {
		expect(mapColumnValue('status', 'Done')).toEqual({ label: 'Done' });
		expect(mapColumnValue('status', 2)).toEqual({ index: 2 });
		expect(mapColumnValue('status', '2')).toEqual({ index: 2 });
	});

	it('maps dropdown labels from CSV and arrays', () => {
		expect(mapColumnValue('dropdown', 'A, B')).toEqual({ labels: ['A', 'B'] });
		expect(mapColumnValue('dropdown', ['A', 'B'])).toEqual({ labels: ['A', 'B'] });
	});

	it('maps people including team: prefix', () => {
		expect(mapColumnValue('people', '123, team:45')).toEqual({
			personsAndTeams: [
				{ id: 123, kind: 'person' },
				{ id: 45, kind: 'team' },
			],
		});
	});

	it('sends date-only values as-is', () => {
		expect(mapColumnValue('date', '2026-07-14')).toEqual({ date: '2026-07-14' });
		expect(mapColumnValue('date', '2026-07-14', { timezone: 'Asia/Tokyo' })).toEqual({
			date: '2026-07-14',
		});
	});

	it('converts timed dates with an explicit offset to UTC', () => {
		expect(mapColumnValue('date', '2026-10-05T07:30:00-04:00')).toEqual({
			date: '2026-10-05',
			time: '11:30:00',
		});
		expect(mapColumnValue('date', '2026-07-14T23:30:45+02:00', { timezone: 'Asia/Tokyo' })).toEqual(
			{ date: '2026-07-14', time: '21:30:45' },
		);
	});

	it('applies the workflow timezone to timed dates without an offset', () => {
		expect(mapColumnValue('date', '2026-07-14 15:30', { timezone: 'America/New_York' })).toEqual({
			date: '2026-07-14',
			time: '19:30:00',
		});
		expect(mapColumnValue('date', '2026-07-14T23:30:45', { timezone: 'Asia/Tokyo' })).toEqual({
			date: '2026-07-14',
			time: '14:30:45',
		});
	});

	it('maps Date objects to UTC date and time', () => {
		expect(mapColumnValue('date', new Date('2026-07-14T15:30:00Z'))).toEqual({
			date: '2026-07-14',
			time: '15:30:00',
		});
	});

	it('hands unparseable dates to the API unchanged', () => {
		expect(mapColumnValue('date', 'someday')).toEqual({ date: 'someday' });
	});

	it('maps world clock timezones', () => {
		expect(mapColumnValue('world_clock', ' Europe/Athens ')).toEqual({
			timezone: 'Europe/Athens',
		});
	});

	it('maps checkbox truthy and falsy values', () => {
		expect(mapColumnValue('checkbox', true)).toEqual({ checked: 'true' });
		expect(mapColumnValue('checkbox', 'yes')).toEqual({ checked: 'true' });
		expect(mapColumnValue('checkbox', false)).toBeNull();
	});

	it('maps numbers to strings', () => {
		expect(mapColumnValue('numbers', 42.5)).toBe('42.5');
	});

	it('maps timeline and week ranges', () => {
		expect(mapColumnValue('timeline', '2026-01-01/2026-01-31')).toEqual({
			from: '2026-01-01',
			to: '2026-01-31',
		});
		expect(mapColumnValue('timeline', '2026-01-01 to 2026-01-31')).toEqual({
			from: '2026-01-01',
			to: '2026-01-31',
		});
		expect(mapColumnValue('week', '2026-01-05/2026-01-11')).toEqual({
			week: { startDate: '2026-01-05', endDate: '2026-01-11' },
		});
	});

	it('maps link and email with optional display text', () => {
		expect(mapColumnValue('link', 'https://monday.com')).toEqual({
			url: 'https://monday.com',
			text: 'https://monday.com',
		});
		expect(mapColumnValue('link', 'https://monday.com Home page')).toEqual({
			url: 'https://monday.com',
			text: 'Home page',
		});
		expect(mapColumnValue('email', 'a@b.com Support')).toEqual({
			email: 'a@b.com',
			text: 'Support',
		});
	});

	it('maps phone, location, hour, and country', () => {
		expect(mapColumnValue('phone', '+15551234567 us')).toEqual({
			phone: '+15551234567',
			countryShortName: 'US',
		});
		expect(mapColumnValue('location', '32.07,34.79,Tel Aviv, Israel')).toEqual({
			lat: '32.07',
			lng: '34.79',
			address: 'Tel Aviv, Israel',
		});
		expect(mapColumnValue('hour', '09:30')).toEqual({ hour: 9, minute: 30 });
		expect(mapColumnValue('country', 'il')).toEqual({ countryCode: 'IL' });
	});

	it('maps relations and tags to numeric ID lists', () => {
		expect(mapColumnValue('board_relation', '1, 2')).toEqual({ item_ids: [1, 2] });
		expect(mapColumnValue('tags', ['7'])).toEqual({ tag_ids: [7] });
	});

	it('sends unknown types as plain strings', () => {
		expect(mapColumnValue('some_future_type', 'hello')).toBe('hello');
	});
});

describe('buildColumnValues', () => {
	it('maps each column by its board type', () => {
		const result = buildColumnValues(
			{ status_1: 'Done', num_1: 3, unknown_col: 'x' },
			{ status_1: 'status', num_1: 'numbers' },
		);
		expect(result).toEqual({ status_1: { label: 'Done' }, num_1: '3', unknown_col: 'x' });
	});
});

describe('READ_ONLY_COLUMN_TYPES', () => {
	it('excludes formula, mirror, and color picker columns', () => {
		expect(READ_ONLY_COLUMN_TYPES.has('formula')).toBe(true);
		expect(READ_ONLY_COLUMN_TYPES.has('mirror')).toBe(true);
		expect(READ_ONLY_COLUMN_TYPES.has('color_picker')).toBe(true);
		expect(READ_ONLY_COLUMN_TYPES.has('status')).toBe(false);
		expect(READ_ONLY_COLUMN_TYPES.has('world_clock')).toBe(false);
	});
});
