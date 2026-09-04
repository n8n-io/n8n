import { DateTime } from 'luxon';
import type { MockProxy } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { createExecuteContext, setParams } from '../helpers';
import {
	optionalText,
	requiredText,
	toGraphUtc,
} from '../../../../v2/actions/onlineMeeting/shared';

describe('Microsoft Teams V2 — onlineMeeting shared helpers', () => {
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		ctx = createExecuteContext();
	});

	describe('requiredText', () => {
		it('returns the trimmed value', () => {
			setParams(ctx, { externalId: '  order-4711  ' });

			expect(requiredText.call(ctx, 'externalId', 0, 'External ID')).toBe('order-4711');
		});

		it.each([
			['empty', ''],
			['whitespace', '   '],
			['null', null],
		])('throws when the value is %s', (_label, value) => {
			setParams(ctx, { externalId: value });

			expect(() => requiredText.call(ctx, 'externalId', 0, 'External ID')).toThrow(
				'The External ID must not be empty',
			);
		});

		it('throws when the value is an object', () => {
			setParams(ctx, { externalId: { id: 4711 } });

			expect(() => requiredText.call(ctx, 'externalId', 0, 'External ID')).toThrow(
				'The External ID must be text',
			);
		});
	});

	describe('optionalText', () => {
		it.each([
			['undefined', undefined, ''],
			['null', null, ''],
			['whitespace', '   ', ''],
			['padded text', '  Kickoff  ', 'Kickoff'],
			['a number', 4711, '4711'],
			[
				'a Luxon value',
				DateTime.fromISO('2026-09-12T10:00:00Z', { zone: 'utc' }),
				'2026-09-12T10:00:00.000Z',
			],
			['a JavaScript Date', new Date('2026-09-12T10:00:00+05:00'), '2026-09-12T05:00:00.000Z'],
			['an invalid Luxon value', DateTime.fromISO('garbage'), ''],
			['an invalid JavaScript Date', new Date('garbage'), ''],
		])('returns %s as trimmed text', (_label, value, expected) => {
			expect(optionalText.call(ctx, value, 'Subject')).toBe(expected);
		});

		it.each([
			['an object', { title: 'Kickoff' }],
			['an array', ['Kickoff']],
		])('throws when the value is %s', (_label, value) => {
			expect(() => optionalText.call(ctx, value, 'Subject')).toThrow('The Subject must be text');
		});
	});

	describe('toGraphUtc', () => {
		it.each([
			['a picker value in the workflow timezone', '2026-09-12T10:00:00', '2026-09-12T08:00:00Z'],
			['a string with an offset', '2026-09-12T10:00:00+05:00', '2026-09-12T05:00:00Z'],
			['a UTC string', '2026-09-12T10:00:00Z', '2026-09-12T10:00:00Z'],
			[
				'a Luxon value',
				DateTime.fromISO('2026-09-12T10:00:00', { zone: 'America/New_York' }),
				'2026-09-12T14:00:00Z',
			],
			['a JavaScript Date', new Date('2026-09-12T10:00:00+05:00'), '2026-09-12T05:00:00Z'],
		])('converts %s to UTC', (_label, value, expected) => {
			ctx.getTimezone.mockReturnValue('Europe/Berlin');

			expect(toGraphUtc.call(ctx, value, 'Start Time')).toBe(expected);
		});

		it('throws on a value that is not a date', () => {
			expect(() => toGraphUtc.call(ctx, 'tomorrow', 'Start Time')).toThrow(
				'The Start Time is not a valid date',
			);
		});
	});
});
