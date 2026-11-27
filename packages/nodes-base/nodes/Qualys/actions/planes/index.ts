/**
 * Plane selection.
 *
 * Resources are the UI grouping; planes are the transport grouping. Several
 * resources share a plane - IT Asset and EASM are both CSAM - so the request
 * machinery lives here rather than in any one resource folder.
 *
 * This module is the only place that knows which plane maps to which pager, so
 * the plane modules never import each other.
 */
import type { IExecuteFunctions } from 'n8n-workflow';

import type { Operation } from '../resources';
import type { Pager } from '../shared/paging';

export type { Pager, PagedRequest } from '../shared/paging';
import { csamPager } from './csam';
import { foPager } from './fo';
import { gatewayPager } from './gateway';
import { otPager } from './ot';

export { buildCsamBody, buildCsamQuery, clampCsamPageSize, formatCsamDate } from './csam';
export type { CsamFilter } from './csam';
export { buildCsamFilter, buildComponentFilter } from './csam';
export { buildFoParameters, validateFoParameters } from './fo';
export { buildFilterExpression, buildOtQuery, buildSortExpression, resolveSortField } from './ot';

export function createPager(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): Pager {
	if (definition.plane === 'ot') {
		return otPager.call(this, definition, itemIndex);
	}

	if (definition.plane === 'gateway') {
		return gatewayPager(definition);
	}

	if (definition.plane === 'csam') {
		return csamPager.call(this, definition, itemIndex);
	}

	return foPager.call(this, definition, itemIndex);
}
