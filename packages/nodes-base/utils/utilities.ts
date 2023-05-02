import type { IDataObject, IDisplayOptions, INodeProperties } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { isEqual, isNull, merge } from 'lodash';

/**
 * Creates an array of elements split into groups the length of `size`.
 * If `array` can't be split evenly, the final chunk will be the remaining
 * elements.
 *
 * @param {Array} array The array to process.
 * @param {number} [size=1] The length of each chunk
 * @example
 *
 * chunk(['a', 'b', 'c', 'd'], 2)
 * // => [['a', 'b'], ['c', 'd']]
 *
 * chunk(['a', 'b', 'c', 'd'], 3)
 * // => [['a', 'b', 'c'], ['d']]
 */

export function chunk(array: any[], size = 1) {
	const length = array == null ? 0 : array.length;
	if (!length || size < 1) {
		return [];
	}
	let index = 0;
	let resIndex = 0;
	const result = new Array(Math.ceil(length / size));

	while (index < length) {
		result[resIndex++] = array.slice(index, (index += size));
	}
	return result;
}

/**
 * Takes a multidimensional array and converts it to a one-dimensional array.
 *
 * @param {Array} nestedArray The array to be flattened.
 * @example
 *
 * flatten([['a', 'b'], ['c', 'd']])
 * // => ['a', 'b', 'c', 'd']
 *
 */

export function flatten(nestedArray: any[][]) {
	const result = [];

	(function loop(array: any[] | any) {
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(array[i])) {
				loop(array[i]);
			} else {
				result.push(array[i]);
			}
		}
	})(nestedArray);

	return result;
}

export function updateDisplayOptions(
	displayOptions: IDisplayOptions,
	properties: INodeProperties[],
) {
	return properties.map((nodeProperty) => {
		return {
			...nodeProperty,
			displayOptions: merge({}, nodeProperty.displayOptions, displayOptions),
		};
	});
}

function isFalsy<T>(value: T) {
	if (isNull(value)) return true;
	if (typeof value === 'string' && value === '') return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

const parseStringAndCompareToObject = (str: string, arr: IDataObject) => {
	try {
		const parsedArray = jsonParse(str);
		return isEqual(parsedArray, arr);
	} catch (error) {
		return false;
	}
};

export const fuzzyCompare = (useFuzzyCompare: boolean, compareVersion = 1) => {
	if (!useFuzzyCompare) {
		//Fuzzy compare is false we do strict comparison
		return <T, U>(item1: T, item2: U) => isEqual(item1, item2);
	}

	return <T, U>(item1: T, item2: U) => {
		//Both types are the same, so we do strict comparison
		if (!isNull(item1) && !isNull(item2) && typeof item1 === typeof item2) {
			return isEqual(item1, item2);
		}

		if (compareVersion >= 2) {
			//Null, 0 and "0" treated as equal
			if (isNull(item1) && (isNull(item2) || item2 === 0 || item2 === '0')) {
				return true;
			}

			if (isNull(item2) && (isNull(item1) || item1 === 0 || item1 === '0')) {
				return true;
			}
		}

		//Null, empty strings, empty arrays all treated as the same
		if (isFalsy(item1) && isFalsy(item2)) return true;

		//When a field is missing in one branch and isFalsy() in another, treat them as matching
		if (isFalsy(item1) && item2 === undefined) return true;
		if (item1 === undefined && isFalsy(item2)) return true;

		//Compare numbers and strings representing that number
		if (typeof item1 === 'number' && typeof item2 === 'string') {
			return item1.toString() === item2;
		}

		if (typeof item1 === 'string' && typeof item2 === 'number') {
			return item1 === item2.toString();
		}

		//Compare objects/arrays and their stringified version
		if (!isNull(item1) && typeof item1 === 'object' && typeof item2 === 'string') {
			return parseStringAndCompareToObject(item2, item1 as IDataObject);
		}

		if (!isNull(item2) && typeof item1 === 'string' && typeof item2 === 'object') {
			return parseStringAndCompareToObject(item1, item2 as IDataObject);
		}

		//Compare booleans and strings representing the boolean (’true’, ‘True’, ‘TRUE’)
		if (typeof item1 === 'boolean' && typeof item2 === 'string') {
			if (item1 === true && item2.toLocaleLowerCase() === 'true') return true;
			if (item1 === false && item2.toLocaleLowerCase() === 'false') return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'string') {
			if (item2 === true && item1.toLocaleLowerCase() === 'true') return true;
			if (item2 === false && item1.toLocaleLowerCase() === 'false') return true;
		}

		//Compare booleans and the numbers/string 0 and 1
		if (typeof item1 === 'boolean' && typeof item2 === 'number') {
			if (item1 === true && item2 === 1) return true;
			if (item1 === false && item2 === 0) return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'number') {
			if (item2 === true && item1 === 1) return true;
			if (item2 === false && item1 === 0) return true;
		}

		if (typeof item1 === 'boolean' && typeof item2 === 'string') {
			if (item1 === true && item2 === '1') return true;
			if (item1 === false && item2 === '0') return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'string') {
			if (item2 === true && item1 === '1') return true;
			if (item2 === false && item1 === '0') return true;
		}

		return isEqual(item1, item2);
	};
};

export const keysToLowercase = <T>(headers: T) => {
	if (typeof headers !== 'object' || Array.isArray(headers) || headers === null) return headers;
	return Object.entries(headers).reduce((acc, [key, value]) => {
		acc[key.toLowerCase()] = value;
		return acc;
	}, {} as IDataObject);
};
