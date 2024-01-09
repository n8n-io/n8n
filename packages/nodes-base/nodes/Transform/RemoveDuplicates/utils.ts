import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';
import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';

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
