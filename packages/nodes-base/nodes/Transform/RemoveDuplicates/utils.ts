import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';
import {
	NodeOperationError,
	type IDataObject,
	type INode,
	type INodeExecutionData,
} from 'n8n-workflow';

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

export const validateInputData = (
	node: INode,
	items: INodeExecutionData[],
	keysToCompare: string[],
	disableDotNotation: boolean,
) => {
	for (const key of keysToCompare) {
		let type: any = undefined;
		for (const [i, item] of items.entries()) {
			if (key === '') {
				throw new NodeOperationError(node, 'Name of field to compare is blank');
			}
			const value = !disableDotNotation ? get(item.json, key) : item.json[key];
			if (value === null && node.typeVersion > 1) continue;

			if (value === undefined && disableDotNotation && key.includes('.')) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`, {
					description:
						"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
				});
			} else if (value === undefined) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`);
			}
			if (type !== undefined && value !== undefined && type !== typeof value) {
				const description =
					'The type of this field varies between items' +
					(node.typeVersion > 1
						? `, in item [${i - 1}] it's a ${type} and in item [${i}] it's a ${typeof value} `
						: '');
				throw new NodeOperationError(node, `'${key}' isn't always the same type`, {
					description,
				});
			} else {
				type = typeof value;
			}
		}
	}
};
