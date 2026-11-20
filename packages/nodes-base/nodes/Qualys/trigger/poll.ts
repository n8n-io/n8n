/**
 * One poll of the VMDR platform API.
 *
 * A poll reads a window of time: everything that changed between where the last
 * poll stopped and now. The window's upper bound is fixed when the poll starts,
 * so a record changing mid-poll belongs to the next window rather than being
 * read twice or missed.
 *
 * The high-water mark lives in the workflow's static data, which n8n persists
 * per node, so an instance restart resumes where the last poll left off rather
 * than replaying the interval or skipping it.
 */
import {
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type IPollFunctions,
} from 'n8n-workflow';

import { buildFoParameters } from '../actions/planes/fo';
import { extractRecords, flattenDetections, normalizeRecord } from '../actions/shared/records';
import type { Operation } from '../actions/resources';
import { findNextBatchUrl, qualysApiRequest } from '../transport';
import { operationFor, TRIGGER_EVENTS, type TriggerEvent } from './events';

/**
 * A backstop against a window that never drains. The subscription's rate limit
 * bites long before this, and stopping here leaves the resume point in static
 * data, so the next poll carries on rather than losing the backlog.
 */
const MAX_POLL_PAGES = 100;

const DEFAULT_LOOKBACK_MINUTES = 60;
const DEFAULT_TRUNCATION = 1000;
const DEFAULT_MAX_RECORDS = 1000;

/**
 * The Options collection mixes how the trigger polls with the Qualys filters it
 * sends. The polling settings are split off here, so that everything left over
 * can be passed to the API verbatim.
 */
type PollOptions = {
	lookbackMinutes: number;
	maxRecords: number;
	truncationLimit: number;
	filters: IDataObject;
};

function readOptions(this: IPollFunctions): PollOptions {
	const { lookbackMinutes, maxRecords, truncationLimit, ...filters } = this.getNodeParameter(
		'options',
		{},
	) as IDataObject;

	const truncation = Number(truncationLimit ?? DEFAULT_TRUNCATION);

	return {
		lookbackMinutes: Number(lookbackMinutes ?? DEFAULT_LOOKBACK_MINUTES),
		maxRecords: Math.max(0, Number(maxRecords ?? DEFAULT_MAX_RECORDS) || 0),
		truncationLimit: Number.isFinite(truncation) ? Math.max(0, truncation) : DEFAULT_TRUNCATION,
		filters,
	};
}

/**
 * What survives between polls.
 *
 * `since` is the start of the next fresh window. While a window is still
 * draining, `resumeUrl` holds the next-batch URL to carry on from and
 * `resumeUntil` the upper bound that window was opened with - `since` only
 * moves there once the last batch is in, so an interrupted poll cannot skip
 * the records it never read.
 */
type PollState = {
	since?: string;
	resumeUrl?: string;
	resumeUntil?: string;
};

/** The slice of time this poll is responsible for. */
type Window = {
	/** Where the first request starts reading. */
	since: string;
	/** The mark to advance to, once every batch in the window is in. */
	until: string;
	/** Set when a previous poll left this window unfinished. */
	resumeUrl?: string;
};

/** Qualys wants `YYYY-MM-DDTHH:MM:SSZ`; a JS ISO string carries milliseconds. */
export function formatQualysDate(date: Date): string {
	return `${date.toISOString().slice(0, 19)}Z`;
}

export function lookbackFrom(now: Date, minutes: number): string {
	const safe = Number.isFinite(minutes) ? Math.max(0, minutes) : DEFAULT_LOOKBACK_MINUTES;
	return formatQualysDate(new Date(now.getTime() - safe * 60_000));
}

function readEvent(this: IPollFunctions): TriggerEvent {
	const name = this.getNodeParameter('event') as string;
	const event = TRIGGER_EVENTS[name];

	if (!event) {
		throw new NodeOperationError(this.getNode(), `Unsupported event: ${String(name)}`, {
			description:
				'Reselect the event. A workflow saved against an older version of this node can still hold a retired one.',
		});
	}

	return event;
}

/**
 * Where this poll reads from, and what it may advance the mark to.
 *
 * A manual poll is someone pressing "Fetch Test Event". It reads the lookback
 * the first real poll would and never resumes a backlog, so testing a workflow
 * cannot consume records the live trigger has not emitted yet.
 */
function openWindow(state: PollState, lookback: number, manual: boolean, now: Date): Window {
	if (manual) {
		return { since: lookbackFrom(now, lookback), until: formatQualysDate(now) };
	}

	if (typeof state.resumeUrl === 'string') {
		return {
			since: state.since ?? lookbackFrom(now, lookback),
			until: state.resumeUntil ?? formatQualysDate(now),
			resumeUrl: state.resumeUrl,
		};
	}

	return {
		since: state.since ?? lookbackFrom(now, lookback),
		until: formatQualysDate(now),
	};
}

/** The query for a fresh window. A resumed one reuses the URL Qualys handed back. */
function buildQuery(event: TriggerEvent, options: PollOptions, since: string): IDataObject {
	return {
		...event.defaults,
		...buildFoParameters(options.filters),
		action: operationFor(event).apiAction ?? 'list',
		truncation_limit: options.truncationLimit,
		[event.since]: since,
	};
}

/**
 * A detection response nests detections under each host. The trigger offers the
 * same choice the node does, and defaults the same way: one item per detection,
 * which is what joins cleanly against the KnowledgeBase.
 */
function expand(this: IPollFunctions, event: TriggerEvent, records: unknown[]): unknown[] {
	if (event.operation !== 'listDetections') {
		return records;
	}

	return this.getNodeParameter('itemGranularity', 'detection') === 'detection'
		? flattenDetections(records)
		: records;
}

/**
 * Read the window, batch by batch, until Qualys stops offering a next one or
 * the poll has taken as much as it is allowed to.
 *
 * Batches are taken whole: Qualys resumes from the end of one, so cutting
 * inside a page would leave no way to ask for the rest of it. A poll can
 * therefore overshoot the cap by up to one batch.
 */
async function readWindow(
	this: IPollFunctions,
	event: TriggerEvent,
	definition: Operation,
	window: Window,
	options: PollOptions,
): Promise<{ records: unknown[]; nextUrl: string | undefined }> {
	const qs = buildQuery(event, options, window.since);
	const { maxRecords } = options;
	const records: unknown[] = [];

	let nextUrl = window.resumeUrl;
	let first = window.resumeUrl === undefined;
	let pages = 0;

	while (first || nextUrl) {
		// Sequential by design: the next batch is named by the response to the
		// current one, and the platform API throttles hard on concurrency.
		const response = await qualysApiRequest.call(this, {
			plane: 'fo',
			endpoint: first ? definition.endpoint : (nextUrl as string),
			method: 'GET',
			qs: first ? qs : undefined,
			xml: definition.xml,
		});

		first = false;
		pages += 1;

		const body = (response.body ?? {}) as IDataObject;
		records.push(...expand.call(this, event, extractRecords(body, definition.recordPath)));
		nextUrl = findNextBatchUrl(body);

		if (pages >= MAX_POLL_PAGES || (maxRecords > 0 && records.length >= maxRecords)) {
			break;
		}
	}

	return { records, nextUrl };
}

/**
 * A window that drained moves the high-water mark to the bound it was opened
 * with. One that stopped early keeps the mark where it was and remembers how to
 * carry on, so the next poll finishes the backlog before opening a new window.
 */
function persist(state: PollState, window: Window, nextUrl: string | undefined): void {
	if (nextUrl) {
		state.resumeUrl = nextUrl;
		state.resumeUntil = window.until;
		return;
	}

	state.since = window.until;
	delete state.resumeUrl;
	delete state.resumeUntil;
}

export async function poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const event = readEvent.call(this);
	const manual = this.getMode() === 'manual';
	const state = this.getWorkflowStaticData('node') as PollState;
	const options = readOptions.call(this);

	const window = openWindow(state, options.lookbackMinutes, manual, new Date());
	const { records, nextUrl } = await readWindow.call(
		this,
		event,
		operationFor(event),
		window,
		options,
	);

	if (!manual) {
		persist(state, window, nextUrl);
	}

	// A poll that found nothing emits nothing: an empty item would run the
	// workflow on every interval.
	return records.length === 0
		? null
		: [records.map((record) => ({ json: normalizeRecord(record, false) }))];
}
