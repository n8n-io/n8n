/**
 * The VMDR platform API (`qualysapi`).
 *
 * Filtering is a flat set of query parameters with rules about which may appear
 * together, so they are validated before the request leaves. Paging follows the
 * next-batch URL Qualys puts in a WARNING element.
 */
import { NodeOperationError, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';

import { findNextBatchUrl } from '../../../transport';
import {
	FO_DEFAULT_TRUNCATION,
	FO_ID_WINDOW_CEILING,
	FO_ID_WINDOW_EMPTY_RUN,
	FO_ID_WINDOW_SIZE,
	type Operation,
} from '../../resources';
import { getCollectionEntries } from '../../shared/collections';
import type { Pager } from '../../shared/paging';

// ------------------------------------------------- flat query parameters (FO)

/**
 * The platform API takes a fixed set of named parameters rather than a filter
 * expression. Empty values are dropped so an untouched collection field does
 * not narrow the result set.
 */
export function buildFoParameters(options: IDataObject): IDataObject {
	const qs: IDataObject = {};

	for (const [key, value] of Object.entries(options ?? {})) {
		if (value === undefined || value === null || value === '') {
			continue;
		}

		if (typeof value === 'boolean') {
			qs[key] = value ? 1 : 0;
			continue;
		}

		qs[key] = value as IDataObject['value'];
	}

	const extras = getCollectionEntries(options, 'extraParameters') as Array<Record<string, unknown>>;
	delete qs.extraParameters;

	for (const extra of extras) {
		const name = String(extra.name ?? '').trim();
		if (!name) {
			continue;
		}
		qs[name] = String(extra.value ?? '');
	}

	return qs;
}

/** Parameter pairs Qualys refuses to accept together. */
const MUTUALLY_EXCLUSIVE: Array<[string, string]> = [
	['ag_ids', 'ag_titles'],
	['detection_updated_since', 'max_days_since_detection_updated'],
	['detection_last_tested_since', 'detection_last_tested_since_days'],
	['detection_last_tested_before', 'detection_last_tested_before_days'],
	['vm_scan_since', 'max_days_since_last_vm_scan'],
	['no_vm_scan_since', 'max_days_since_last_vm_scan'],
	['arf_filter_keys', 'arf_kernel_filter'],
	['include_search_list_ids', 'include_search_list_titles'],
	['exclude_search_list_ids', 'exclude_search_list_titles'],
];

const SEARCH_LIST_PARAMS = [
	'include_search_list_ids',
	'include_search_list_titles',
	'exclude_search_list_ids',
	'exclude_search_list_titles',
];

const HOST_TARGET_PARAMS = ['ids', 'ips', 'ag_ids', 'ag_titles', 'id_min', 'id_max'];

/** Score ranges, each gated behind the toggle that makes the score available. */
const SCORE_RANGES: Array<[string, string, string]> = [
	['qds_min', 'qds_max', 'show_qds'],
	['trurisk_min', 'trurisk_max', 'show_trurisk'],
];

type Predicate = (key: string) => boolean;

function findExclusiveClash(has: Predicate): string | undefined {
	for (const [first, second] of MUTUALLY_EXCLUSIVE) {
		if (has(first) && has(second)) {
			return `Qualys does not accept "${first}" and "${second}" in the same request.`;
		}
	}

	return undefined;
}

function findTargetClash(has: Predicate): string | undefined {
	if (SEARCH_LIST_PARAMS.some(has) && (has('qids') || has('severities'))) {
		return 'Search list parameters cannot be combined with "qids" or "severities".';
	}

	if (has('ipv6') && HOST_TARGET_PARAMS.some(has)) {
		return 'When "ipv6" is used, no other host target parameter is accepted.';
	}

	return undefined;
}

function findRangeProblem(qs: IDataObject, has: Predicate): string | undefined {
	for (const [min, max, toggle] of SCORE_RANGES) {
		if ((has(min) || has(max)) && !has(toggle)) {
			return `"${min}"/"${max}" require "${toggle}" to be enabled.`;
		}

		if (has(min) && has(max) && Number(qs[min]) >= Number(qs[max])) {
			return `"${min}" must be lower than "${max}".`;
		}
	}

	return undefined;
}

/**
 * Qualys rejects several parameter combinations with an opaque 400. Catching
 * them here turns that into an actionable message.
 */
export function validateFoParameters(qs: IDataObject): string | undefined {
	const has: Predicate = (key) =>
		qs[key] !== undefined && qs[key] !== null && qs[key] !== '' && qs[key] !== 0;

	return findExclusiveClash(has) ?? findTargetClash(has) ?? findRangeProblem(qs, has);
}

/** Query-string parameters for the first platform API call. */
function buildFoQuery(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): IDataObject {
	const options = definition.optionsProperty
		? (this.getNodeParameter(definition.optionsProperty, itemIndex, {}) as IDataObject)
		: {};
	const qs = buildFoParameters(options);
	qs.action = definition.apiAction ?? 'list';

	if (definition.truncatable) {
		const requested = Number(
			this.getNodeParameter('truncationLimit', itemIndex, FO_DEFAULT_TRUNCATION),
		);
		qs.truncation_limit = Number.isFinite(requested)
			? Math.max(0, requested)
			: FO_DEFAULT_TRUNCATION;
	}

	if (definition.operation === 'listCveScores') {
		const cve = String(this.getNodeParameter('cve', itemIndex, '')).trim();
		if (!cve) {
			throw new NodeOperationError(this.getNode(), 'At least one CVE ID is required.', {
				itemIndex,
			});
		}
		qs.cve = cve;
		qs.details = qs.details ?? 'Basic';
	}

	const problem = validateFoParameters(qs);
	if (problem) {
		throw new NodeOperationError(this.getNode(), problem, { itemIndex });
	}

	return qs;
}

// ------------------------------------------------------- id-windowed paging

/**
 * A request that already names the records it wants comes back small, so it is
 * sent as-is rather than walked. An id range is not such a request: it bounds
 * the walk instead of replacing it.
 */
function isNarrowedToRecords(qs: IDataObject): boolean {
	return ['ids', 'cve', 'qids'].some((key) => {
		const value = qs[key];
		return value !== undefined && value !== null && String(value).trim() !== '';
	});
}

function boundary(qs: IDataObject, key: string): number | undefined {
	const value = Number(qs[key]);
	return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Walk an endpoint that has no paging of its own by asking for one id window at
 * a time.
 *
 * The KnowledgeBase API answers `action=list` with every QID that matches, in a
 * single response, and takes no truncation limit. In full detail that is far
 * more than the ~512 MB string Node can build, so the request fails before a
 * byte of it can be parsed. Splitting the id space into windows keeps each
 * response small and makes a complete pull possible.
 *
 * A Minimum/Maximum QID supplied on the operation bounds the walk exactly; with
 * no maximum the walk runs to a ceiling well above the highest QID Qualys has
 * issued, stopping early once a run of windows comes back empty.
 */
function idWindowPager(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
	qs: IDataObject,
): Pager {
	const requested = Number(this.getNodeParameter('idWindowSize', itemIndex, FO_ID_WINDOW_SIZE));
	const size =
		Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : FO_ID_WINDOW_SIZE;

	const start = boundary(qs, 'id_min') ?? 1;
	const end = boundary(qs, 'id_max');

	let cursor = start;
	let emptyRun = 0;
	let done = false;

	return {
		next: () => {
			if (done) {
				return undefined;
			}

			const windowEnd = end === undefined ? cursor + size - 1 : Math.min(cursor + size - 1, end);

			return {
				plane: 'fo' as const,
				endpoint: definition.endpoint,
				method: 'GET' as const,
				qs: { ...qs, id_min: cursor, id_max: windowEnd },
				xml: definition.xml,
			};
		},
		advance: (_body, pageRecordCount) => {
			cursor += size;
			emptyRun = pageRecordCount > 0 ? 0 : emptyRun + 1;

			done =
				end === undefined
					? cursor > FO_ID_WINDOW_CEILING || emptyRun >= FO_ID_WINDOW_EMPTY_RUN
					: cursor > end;
		},
	};
}

/**
 * Platform API: the first call is built from parameters, every later call
 * follows the URL Qualys hands back in the WARNING element.
 */
export function foPager(this: IExecuteFunctions, definition: Operation, itemIndex: number): Pager {
	const qs = buildFoQuery.call(this, definition, itemIndex);

	if (definition.idWindowed && !isNarrowedToRecords(qs)) {
		return idWindowPager.call(this, definition, itemIndex, qs);
	}

	let nextUrl: string | undefined;
	let first = true;

	return {
		next: () => {
			if (first) {
				return {
					plane: 'fo' as const,
					endpoint: definition.endpoint,
					method: 'GET' as const,
					qs,
					xml: definition.xml,
				};
			}

			return nextUrl
				? { plane: 'fo' as const, endpoint: nextUrl, method: 'GET' as const, xml: definition.xml }
				: undefined;
		},
		advance: (body) => {
			first = false;
			nextUrl = findNextBatchUrl(body);
		},
	};
}
