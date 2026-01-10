import type { INodeParameters, NodeParameterValueType } from './interfaces';

/**
 * Checks if an object has array properties that should be expanded.
 * Returns true if at least one property value is an array.
 */
export function hasExpandableArrays(obj: INodeParameters): boolean {
	const values = Object.values(obj);
	return values.some((v) => Array.isArray(v));
}

/**
 * Expands an object with array properties into multiple objects by "zipping" them together.
 * Uses the longest array length, filling shorter arrays with undefined.
 *
 * Example:
 *   Input:  { name: ['A', 'B', 'C'], price: [10, 20, 30], currency: 'USD' }
 *   Output: [
 *     { name: 'A', price: 10, currency: 'USD' },
 *     { name: 'B', price: 20, currency: 'USD' },
 *     { name: 'C', price: 30, currency: 'USD' }
 *   ]
 */
export function expandArraysToObjects(obj: INodeParameters): INodeParameters[] {
	const entries = Object.entries(obj);
	const arrayEntries = entries.filter(([_, v]) => Array.isArray(v));
	const scalarEntries = entries.filter(([_, v]) => !Array.isArray(v));

	if (arrayEntries.length === 0) {
		return [obj];
	}

	const maxLength = Math.max(...arrayEntries.map(([_, arr]) => (arr as unknown[]).length));
	if (maxLength === 0) {
		return [];
	}

	const result: INodeParameters[] = [];
	for (let i = 0; i < maxLength; i++) {
		const newObj: INodeParameters = {};

		// Add scalar values to each expanded object
		for (const [key, value] of scalarEntries) {
			newObj[key] = value;
		}

		// Add array values by index (undefined if array is shorter)
		for (const [key, arr] of arrayEntries) {
			newObj[key] = (arr as NodeParameterValueType[])[i];
		}

		result.push(newObj);
	}

	return result;
}
