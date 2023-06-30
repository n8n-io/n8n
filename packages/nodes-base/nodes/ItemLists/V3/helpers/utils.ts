import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';

import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';

export const compareItems = (
	obj: INodeExecutionData,
	obj2: INodeExecutionData,
	keys: string[],
	disableDotNotation: boolean,
	_node: INode,
) => {
	let result = true;
	for (const key of keys) {
		if (!disableDotNotation) {
			if (!isEqual(get(obj.json, key), get(obj2.json, key))) {
				result = false;
				break;
			}
		} else {
			if (!isEqual(obj.json[key], obj2.json[key])) {
				result = false;
				break;
			}
		}
	}
	return result;
};

export const flattenKeys = (obj: IDataObject, path: string[] = []): IDataObject => {
	return !isObject(obj)
		? { [path.join('.')]: obj }
		: reduce(obj, (cum, next, key) => merge(cum, flattenKeys(next as IDataObject, [...path, key])), {}); //prettier-ignore
};

export const shuffleArray = (array: any[]) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};

export const prepareFieldsArray = (fields: string | string[], fieldName = 'Fields') => {
	if (typeof fields === 'string') {
		return fields
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry !== '');
	}
	if (Array.isArray(fields)) {
		return fields;
	}
	throw new Error(
		`The \'${fieldName}\' parameter must be a string of fields separated by commas or an array of strings.`,
	);
};
