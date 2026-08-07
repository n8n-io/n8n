import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { createTimezoneAwareDateConstructor } from '../src/expression-timezone-date';
import { Workflow } from '../src/workflow';
import * as Helpers from './helpers';

describe('createTimezoneAwareDateConstructor', () => {
	// 2024-01-01T12:00:00.000Z
	const utcNoonMs = Date.UTC(2024, 0, 1, 12, 0, 0, 0);

	it('uses workflow timezone for local getters (America/New_York)', () => {
		const DateTz = createTimezoneAwareDateConstructor('America/New_York');
		const date = new DateTz(utcNoonMs);

		// 12:00 UTC → 07:00 EST
		expect(date.getUTCHours()).toBe(12);
		expect(date.getHours()).toBe(7);
		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(0);
		expect(date.getDate()).toBe(1);
	});

	it('uses workflow timezone for local getters (Asia/Tokyo)', () => {
		const DateTz = createTimezoneAwareDateConstructor('Asia/Tokyo');
		const date = new DateTz(utcNoonMs);

		// 12:00 UTC → 21:00 JST
		expect(date.getHours()).toBe(21);
		expect(date.getTimezoneOffset()).toBe(-540); // UTC+9
	});

	it('matches Luxon wall-clock parts for an offset datetime string', () => {
		const iso = '2026-08-03T14:30:00-05:00';
		const DateTz = createTimezoneAwareDateConstructor('America/Chicago');
		const date = new DateTz(iso);
		const luxon = DateTime.fromISO(iso, { setZone: true }).setZone('America/Chicago');

		expect(date.getFullYear()).toBe(luxon.year);
		expect(date.getMonth()).toBe(luxon.month - 1);
		expect(date.getDate()).toBe(luxon.day);
		expect(date.getHours()).toBe(luxon.hour);
		expect(date.getMinutes()).toBe(luxon.minute);
		expect(date.getSeconds()).toBe(luxon.second);
	});

	it('reproduces #35465-style arithmetic with consistent local formatting', () => {
		const DateTz = createTimezoneAwareDateConstructor('America/New_York');
		const prefered = '2026-08-03T10:00:00-04:00';
		const slotSize = '60';

		const start = new DateTz(prefered);
		const duration = (parseInt(slotSize, 10) || 60) * 60000;
		const end = new DateTz(start.getTime() + duration);
		const offset = prefered.slice(-6);
		const pad = (n: number) => String(n).padStart(2, '0');
		const formatted = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}${offset}`;

		// 10:00 EDT + 60m = 11:00 EDT, still on -04:00
		expect(formatted).toBe('2026-08-03T11:00:00-04:00');
	});
});

describe('Expression native Date uses workflow timezone (#35465)', () => {
	const nodeTypes = Helpers.NodeTypes();

	const makeWorkflow = (timezone: string) =>
		new Workflow({
			id: '1',
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1234',
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			active: false,
			nodeTypes,
			settings: { timezone },
		});

	it('formats Date local getters using workflow timezone, not OS timezone', async () => {
		const workflow = makeWorkflow('America/New_York');
		const expression = workflow.expression;
		await expression.acquireIsolate();

		const data: Array<{ json: Record<string, unknown> }> = [
			{
				json: {
					prefered_datetime: '2026-08-03T10:00:00-04:00',
					slot_size: '60',
				},
			},
		];

		const result = expression.getParameterValue(
			`={{ (() => {
				const start = new Date($json.prefered_datetime);
				const duration = (parseInt($json.slot_size) || 60) * 60000;
				const end = new Date(start.getTime() + duration);
				const offset = $json.prefered_datetime.slice(-6);
				const pad = (n) => String(n).padStart(2, '0');
				return end.getFullYear() + '-' + pad(end.getMonth() + 1) + '-' + pad(end.getDate()) + 'T' + pad(end.getHours()) + ':' + pad(end.getMinutes()) + ':' + pad(end.getSeconds()) + offset;
			})() }}`,
			null,
			0,
			0,
			'node',
			data,
			'manual',
			{},
		);

		await expression.releaseIsolate();

		expect(result).toBe('2026-08-03T11:00:00-04:00');
	});

	it('returns different local hours for the same instant across timezones', async () => {
		const ms = 1704110400000; // 2024-01-01T12:00:00.000Z

		const hoursFor = async (timezone: string) => {
			const workflow = makeWorkflow(timezone);
			await workflow.expression.acquireIsolate();
			const result = workflow.expression.getParameterValue(
				'={{ new Date($json.ts).getHours() }}',
				null,
				0,
				0,
				'node',
				[{ json: { ts: ms } }],
				'manual',
				{},
			);
			await workflow.expression.releaseIsolate();
			return result;
		};

		expect(await hoursFor('America/New_York')).toBe(7);
		expect(await hoursFor('Asia/Tokyo')).toBe(21);
	});
});
