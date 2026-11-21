/**
 * CyberSecurity Asset Management.
 *
 * Shared by the IT Asset and EASM resources: both sit on the same plane, filter
 * with the same asset-criteria document and page on the same cursor.
 */
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	CSAM_PAGE_SIZE_HARD_MAX,
	CSAM_PAGE_SIZE_MAX,
	type Operation,
	type OperationDefinition,
} from '../../resources';
import { getCollectionEntries } from '../../shared/collections';
import { normalizeJoin } from '../../shared/filters';
import type { Pager } from '../../shared/paging';

// ------------------------------------------------------ structured JSON (CSAM)

export type CsamFilter = {
	filters: Array<{ field: string; operator: string; value: string }>;
	operation?: 'AND' | 'OR';
};

/**
 * The Asset Management API takes a flat criteria list joined by one top-level
 * `operation`. There is no nesting and no per-row join, so the grouped QQL
 * builder above does not apply here.
 */
export function buildCsamFilter(parameters: IDataObject, match: string): CsamFilter | undefined {
	const rows = getCollectionEntries(parameters, 'filters') as Array<Record<string, unknown>>;
	const filters: CsamFilter['filters'] = [];

	for (const row of rows) {
		const field = String(row.field ?? '').trim();
		if (!field) {
			continue;
		}

		filters.push({
			field,
			operator: String(row.operator ?? 'CONTAINS').trim(),
			value: String(row.value ?? '').trim(),
		});
	}

	if (filters.length === 0) {
		return undefined;
	}

	const operation = normalizeJoin(match);
	return filters.length > 1 ? { filters, operation } : { filters };
}

/**
 * The software component endpoints take a different document: component-scoped
 * criteria and asset-scoped criteria in separate blocks, ANDed together. Rows
 * are routed by their field prefix so one filter UI can serve both.
 */
export function buildComponentFilter(
	parameters: IDataObject,
	match: string,
): IDataObject | undefined {
	const rows = getCollectionEntries(parameters, 'filters') as Array<Record<string, unknown>>;
	const component: CsamFilter['filters'] = [];
	const asset: CsamFilter['filters'] = [];

	for (const row of rows) {
		const field = String(row.field ?? '').trim();
		if (!field) {
			continue;
		}

		const criteria = {
			field,
			operator: String(row.operator ?? 'CONTAINS').trim(),
			value: String(row.value ?? '').trim(),
		};

		(field.startsWith('component.') ? component : asset).push(criteria);
	}

	if (component.length === 0 && asset.length === 0) {
		return undefined;
	}

	const operation = normalizeJoin(match);
	const block = (filters: CsamFilter['filters']): CsamFilter =>
		filters.length > 1 ? { filters, operation } : { filters };

	const body: IDataObject = {};
	if (component.length > 0) {
		body.componentFilter = block(component) as unknown as IDataObject['value'];
	}
	if (asset.length > 0) {
		body.assetSoftwareFilter = block(asset) as unknown as IDataObject['value'];
	}

	return body;
}

export function clampCsamPageSize(value: number, max = CSAM_PAGE_SIZE_MAX): number {
	const ceiling = Math.max(1, Math.min(max, CSAM_PAGE_SIZE_HARD_MAX));
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) {
		return Math.min(100, ceiling);
	}

	return Math.max(1, Math.min(ceiling, Math.floor(parsed)));
}

/** The API wants `yyyy-MM-ddTHH:mmZ`; n8n hands over a full ISO timestamp. */
export function formatCsamDate(value: string): string {
	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return value.trim();
	}

	return `${parsed.toISOString().slice(0, 16)}Z`;
}

export function buildCsamQuery(
	options: IDataObject,
	cursor?: number,
	definition?: Pick<OperationDefinition, 'cursor' | 'pageSize'>,
): IDataObject {
	const sizing = definition?.pageSize ?? { default: 100, max: CSAM_PAGE_SIZE_MAX };
	const qs: IDataObject = {
		pageSize: clampCsamPageSize(Number(options.pageSize ?? sizing.default), sizing.max),
	};

	if (cursor) {
		qs[definition?.cursor?.requestParam ?? 'lastSeenAssetId'] = cursor;
	}

	for (const key of ['includeFields', 'excludeFields', 'softwareType'] as const) {
		const value = options[key];
		if (typeof value === 'string' && value.trim()) {
			qs[key] = value.trim();
		}
	}

	if (typeof options.assetLastUpdated === 'string' && options.assetLastUpdated.trim()) {
		qs.assetLastUpdated = formatCsamDate(options.assetLastUpdated);
	}

	return qs;
}

export function buildCsamBody(
	definition: Pick<OperationDefinition, 'filterShape'>,
	rows: IDataObject,
	match: string,
): IDataObject | undefined {
	return definition.filterShape === 'componentFilter'
		? buildComponentFilter(rows, match)
		: (buildCsamFilter(rows, match) as unknown as IDataObject | undefined);
}

/** Asset Management: a cursor carried forward from the previous response. */
export function csamPager(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): Pager {
	const options = this.getNodeParameter('csamOptions', itemIndex, {}) as IDataObject;
	const match = this.getNodeParameter('csamMatch', itemIndex, 'AND') as string;
	const rows = this.getNodeParameter('csamFilters', itemIndex, {}) as IDataObject;
	const filter = buildCsamBody(definition, rows, match);

	let cursor: number | undefined;
	let exhausted = false;

	return {
		next: () =>
			exhausted
				? undefined
				: {
						plane: 'csam' as const,
						endpoint: definition.endpoint,
						method: 'POST' as const,
						qs: buildCsamQuery(options, cursor, definition),
						body: filter,
					},
		advance: (body) => {
			const hasMore = Number(body.hasMore ?? 0);
			// The request parameter and the response field are not the same name on
			// every Asset Management endpoint.
			const field = definition.cursor?.responseField ?? 'lastSeenAssetId';
			const lastSeen = Number(body[field] ?? 0);

			if (hasMore !== 1 || !lastSeen || lastSeen === cursor) {
				exhausted = true;
				return;
			}

			cursor = lastSeen;
		},
	};
}
