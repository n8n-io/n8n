import { afterAll, beforeAll } from 'vitest';
import { DateTime, Duration, Interval } from 'luxon';

import type { IDataObject } from '../../src/interfaces';
import { Workflow } from '../../src/workflow';
import * as Helpers from '../helpers';

export const nodeTypes = Helpers.NodeTypes();
export const workflow = new Workflow({
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
});
export const expression = workflow.expression;

// acquireIsolate/releaseIsolate are no-ops for the legacy engine, so these
// hooks are safe to register unconditionally.
beforeAll(async () => {
	await expression.acquireIsolate();
});
afterAll(async () => {
	await expression.releaseIsolate();
});

export const evaluate = (value: string, values?: IDataObject[]) =>
	expression.getParameterValue(
		value,
		null,
		0,
		0,
		'node',
		values?.map((v) => ({ json: v })) ?? [],
		'manual',
		{},
	);

/**
 * Normalize expression results that may be Luxon instances or ISO strings.
 *
 * Both engines give back Luxon instances. The VM engine sends each Luxon value
 * across the isolate boundary as a marker object and rebuilds an instance from
 * it. More than one copy of Luxon is in play: the runtime bundle inlines its
 * own, because packages/@n8n/expression-runtime/esbuild.config.js sets
 * `external: []`. An instance from another copy fails `instanceof` against the
 * Luxon this file imports, but still passes the Luxon `is*` check. The helpers
 * below re-hydrate such an instance through ISO to get one of the local copy.
 */
export const asDateTime = (v: unknown): DateTime => {
	if (v instanceof DateTime) return v;
	if (DateTime.isDateTime(v)) return DateTime.fromISO(v.toISO() ?? '', { setZone: true });
	if (typeof v !== 'string') throw new Error(`Expected DateTime or ISO string, got ${typeof v}`);
	return DateTime.fromISO(v);
};

export const asDuration = (v: unknown): Duration => {
	if (v instanceof Duration) return v;
	if (Duration.isDuration(v)) return Duration.fromISO(v.toISO() ?? '');
	if (typeof v !== 'string') throw new Error(`Expected Duration or ISO string, got ${typeof v}`);
	return Duration.fromISO(v);
};

export const asInterval = (v: unknown): Interval => {
	if (v instanceof Interval) return v;
	if (Interval.isInterval(v)) return Interval.fromISO(v.toISO());
	if (typeof v !== 'string') throw new Error(`Expected Interval or ISO string, got ${typeof v}`);
	return Interval.fromISO(v);
};

export const getLocalISOString = (date: Date) => {
	const offset = date.getTimezoneOffset();
	const offsetAbs = Math.abs(offset);
	const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
	const hours = String(Math.floor(offsetAbs / 60)).padStart(2, '0');
	const minutes = String(offsetAbs % 60).padStart(2, '0');
	return `${isoString.slice(0, -1)}${offset > 0 ? '-' : '+'}${hours}:${minutes}`;
};
