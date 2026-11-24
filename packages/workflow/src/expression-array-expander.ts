import type { INodeParameters, NodeParameterValueType } from './interfaces';

/**
 * Expands an object into multiple objects by "zipping" the array values of `keys` together.
 * Uses the longest array length, filling shorter arrays with undefined. Other properties,
 * including arrays not listed in `keys`, are copied unchanged into every object.
 *
 * Example, with keys ['name', 'price']:
 *   Input:  { name: ['A', 'B'], price: [10, 20], tags: ['x'], currency: 'USD' }
 *   Output: [
 *     { name: 'A', price: 10, tags: ['x'], currency: 'USD' },
 *     { name: 'B', price: 20, tags: ['x'], currency: 'USD' }
 *   ]
 */
export function expandArraysToObjects(obj: INodeParameters, keys: string[]): INodeParameters[] {
	const arrayEntries = Object.entries(obj).filter(
		([key, value]) => keys.includes(key) && Array.isArray(value),
	);

	if (arrayEntries.length === 0) {
		return [obj];
	}

	const maxLength = Math.max(...arrayEntries.map(([_, arr]) => (arr as unknown[]).length));
	const result: INodeParameters[] = [];
	for (let i = 0; i < maxLength; i++) {
		const newObj: INodeParameters = { ...obj };
		for (const [key, arr] of arrayEntries) {
			newObj[key] = (arr as NodeParameterValueType[])[i];
		}
		result.push(newObj);
	}

	return result;
}
