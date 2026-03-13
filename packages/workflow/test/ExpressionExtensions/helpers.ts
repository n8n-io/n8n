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
 * Normalize expression results that may be Luxon instances (current engine)
 * or ISO strings (VM engine). The VM engine serializes Luxon types to ISO
 * strings at the isolate boundary via __prepareForTransfer.
 *
 * TODO: When the current (Tournament) engine is removed and only the VM
 * engine remains, these helpers become unnecessary — all results will be
 * strings. Replace usages with fromISO() directly.
 */
export const asDateTime = (v: unknown): DateTime =>
	DateTime.isDateTime(v) ? v : DateTime.fromISO(v as string);

export const asDuration = (v: unknown): Duration =>
	Duration.isDuration(v) ? v : Duration.fromISO(v as string);

export const asInterval = (v: unknown): Interval =>
	Interval.isInterval(v) ? v : Interval.fromISO(v as string);

export const getLocalISOString = (date: Date) => {
	const offset = date.getTimezoneOffset();
	const offsetAbs = Math.abs(offset);
	const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
	const hours = String(Math.floor(offsetAbs / 60)).padStart(2, '0');
	const minutes = String(offsetAbs % 60).padStart(2, '0');
	return `${isoString.slice(0, -1)}${offset > 0 ? '-' : '+'}${hours}:${minutes}`;
};
