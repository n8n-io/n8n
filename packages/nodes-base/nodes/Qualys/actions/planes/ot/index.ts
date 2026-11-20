/**
 * VMDR OT.
 *
 * Filtering is QQL: a filter expression built from the grouped rows the UI
 * collects, plus a sort expression. Paging is a zero-based page number with the
 * grand total in a `count` response header.
 */
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { OT_PAGE_SIZE, type Operation } from '../../resources';
import { getCollectionEntries } from '../../shared/collections';
import { normalizeJoin } from '../../shared/filters';
import type { Pager } from '../../shared/paging';
import { readHeader } from '../../shared/records';

// ---------------------------------------------------------------- QQL (OT plane)

function formatQqlValue(value: string): string {
	if (!value) {
		return '""';
	}

	if (/^(?:".*"|'.*'|`.*`|\[.*\])$/.test(value)) {
		return value;
	}

	if (
		/^[+-]?(?:\d+|\d+\.\d+)$/.test(value) ||
		/^(?:true|false)$/i.test(value) ||
		/^now[-+].+$/i.test(value)
	) {
		return value;
	}

	if (/\s/.test(value) || /[,:]/.test(value)) {
		return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}

	return value;
}

function buildRuleExpression(rule: Record<string, unknown>): string {
	const identifier = String(rule.identifier ?? '').trim();
	if (!identifier) {
		return '';
	}

	const operator = String(rule.operator ?? ':').trim();
	const value = String(rule.value ?? '').trim();

	if (operator === 'is null' || operator === 'is not null') {
		return `${identifier} ${operator}`;
	}

	return `${identifier}${operator}${formatQqlValue(value)}`;
}

function buildFlatFilterExpression(rows: Array<Record<string, unknown>>): string {
	const expressions: string[] = [];
	let pendingJoin: 'AND' | 'OR' = 'AND';

	for (const row of rows) {
		const expression = buildRuleExpression(row);
		if (!expression) {
			continue;
		}

		if (expressions.length > 0) {
			expressions.push(pendingJoin.toLowerCase());
		}

		expressions.push(expression);
		pendingJoin = normalizeJoin(String(row.join ?? 'AND'));
	}

	return expressions.join(' ');
}

function buildGroupedFilterExpression(group: Record<string, unknown>): string {
	const rows = getCollectionEntries(group, 'filters') as Array<Record<string, unknown>>;
	const expression = buildFlatFilterExpression(rows);

	if (!expression) {
		return '';
	}

	return rows.length > 1 ? `(${expression})` : expression;
}

export function buildFilterExpression(parameters: IDataObject): string {
	const groups = getCollectionEntries(parameters, 'filterGroups') as Array<Record<string, unknown>>;

	if (groups.length === 0) {
		return buildFlatFilterExpression(
			getCollectionEntries(parameters, 'filters') as Array<Record<string, unknown>>,
		);
	}

	const expressions: string[] = [];
	let pendingJoin: 'AND' | 'OR' = 'AND';

	for (const group of groups) {
		const expression = buildGroupedFilterExpression(group);
		if (!expression) {
			continue;
		}

		if (expressions.length > 0) {
			expressions.push(pendingJoin.toLowerCase());
		}

		expressions.push(expression);
		pendingJoin = normalizeJoin(String(group.join ?? 'AND'));
	}

	return expressions.join(' ');
}

// ------------------------------------------------------------- sorts (OT plane)

/**
 * Sortable fields per operation. The OT API wants fully qualified tokens; these
 * aliases let the short name in the UI stand in for the long one.
 */
const SORT_ALIASES: Record<string, Record<string, string>> = {
	listHostAssets: {
		created: 'asset.created',
		lastUpdated: 'asset.lastUpdated',
		name: 'asset.name',
		risk: 'asset.risk',
		vulnerabilityCount: 'asset.vulnerabilityCount',
	},
	listOtVulnerabilities: {
		criticality: 'vulnerabilities.criticality',
		lastDetected: 'vulnerabilities.lastDetected',
		qid: 'vulnerabilities.qid',
		severity: 'vulnerabilities.severity',
		typeDetected: 'vulnerabilities.typeDetected',
		vulnCategory: 'vulnerabilities.vulnCategory',
	},
	listProjectFiles: {
		assetCount: 'assetCount',
		engineeringToolName: 'engineeringToolName',
		engineeringToolVersion: 'engineeringToolVersion',
		fileHash: 'fileHash',
		lastUpdated: 'lastUpdated',
		name: 'name',
		plantLocation: 'plantLocation',
		status: 'status',
		uploadedBy: 'uploadedBy',
		vendor: 'vendor',
	},
};

export function resolveSortField(operation: string, field: string): string {
	if (!field) {
		return '';
	}

	if (field.includes('.')) {
		return field;
	}

	return SORT_ALIASES[operation]?.[field] ?? field;
}

export function buildSortExpression(operation: string, sorts: IDataObject): string {
	const rules = getCollectionEntries(sorts, 'sorts') as Array<Record<string, unknown>>;
	if (rules.length === 0) {
		return '';
	}

	const sortRules: Array<Record<string, string>> = [];

	for (const rule of rules) {
		const field = resolveSortField(operation, String(rule.field ?? '').trim());
		if (!field) {
			continue;
		}

		const direction = String(rule.direction ?? 'asc').trim() === 'desc' ? 'desc' : 'asc';
		sortRules.push({ [field]: direction });
	}

	return JSON.stringify(sortRules);
}

export function buildOtQuery(
	pageNumber: number,
	pageSize: number,
	filter: string,
	sort: string,
): IDataObject {
	const qs: IDataObject = {
		pageNumber: Math.max(0, Math.floor(pageNumber)),
		pageSize,
	};

	if (filter) {
		qs.filter = filter;
	}

	if (sort) {
		qs.sort = sort;
	}

	return qs;
}

/** VMDR OT: a zero-based page number, with the grand total in a `count` header. */
export function otPager(this: IExecuteFunctions, definition: Operation, itemIndex: number): Pager {
	const filter = buildFilterExpression({
		filterGroups: this.getNodeParameter('filterGroups', itemIndex, {}) as IDataObject,
		filters: this.getNodeParameter('filters', itemIndex, {}) as IDataObject,
	});
	const sort = buildSortExpression(
		definition.operation,
		this.getNodeParameter('sorts', itemIndex, {}) as IDataObject,
	);

	let pageNumber = 0;
	let exhausted = false;
	let seen = 0;
	let total: number | undefined;

	return {
		next: () =>
			exhausted
				? undefined
				: {
						plane: 'ot' as const,
						endpoint: definition.endpoint,
						method: 'GET' as const,
						qs: buildOtQuery(pageNumber, OT_PAGE_SIZE, filter, sort),
						emptyOn404: definition.emptyOn404,
					},
		advance: (_body, pageRecordCount) => {
			if (pageRecordCount < OT_PAGE_SIZE) {
				exhausted = true;
				return;
			}

			seen += pageRecordCount;
			// The OT endpoints report the grand total in a `count` header, so a full
			// final page does not need an extra empty request to confirm it.
			if (total !== undefined && seen >= total) {
				exhausted = true;
				return;
			}

			pageNumber += 1;
		},
		observe: (_body, headers) => {
			const parsed = Number(readHeader(headers, 'count'));
			if (Number.isFinite(parsed)) {
				total = parsed;
			}
		},
	};
}
