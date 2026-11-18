import { UnexpectedError } from 'n8n-workflow';

import type { SortKey } from './types';

const INTEGER = /^-?\d+$/;

/** Safe integers become numbers and larger integers stay bigints, so one value has one form. */
export const toSortKey = (value: unknown): SortKey => {
	if (typeof value === 'bigint') {
		const asNumber = Number(value);
		return Number.isSafeInteger(asNumber) ? asNumber : value;
	}
	if (typeof value === 'string' && INTEGER.test(value.trim()))
		return toSortKey(BigInt(value.trim()));
	const asNumber = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	if (typeof asNumber === 'number' && !Number.isNaN(asNumber)) return asNumber;
	throw new UnexpectedError(`The sort key ${String(value)} is not a number`);
};

export const compareSortKeys = (a: SortKey, b: SortKey) => (a < b ? -1 : a > b ? 1 : 0);

export const sameSortKey = (a: SortKey | null, b: SortKey | null) =>
	a === b || (a !== null && b !== null && compareSortKeys(a, b) === 0);
