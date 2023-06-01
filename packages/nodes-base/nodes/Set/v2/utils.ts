import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, NodeOperationError, jsonParse } from 'n8n-workflow';

import set from 'lodash.set';

export const prepareItem = (
	inputItem: INodeExecutionData,
	setData: IDataObject,
	includeOtherFields: boolean,
	dotNotation = true,
) => {
	const newItem: INodeExecutionData = {
		json: {},
		pairedItem: inputItem.pairedItem,
	};

	if (includeOtherFields) {
		if (inputItem.binary !== undefined) {
			// Create a shallow copy of the binary data so that the old
			// data references which do not get changed still stay behind
			// but the incoming data does not get changed.
			newItem.binary = {};
			Object.assign(newItem.binary, inputItem.binary);
		}

		newItem.json = deepCopy(inputItem.json);

		if (dotNotation) {
			Object.keys(setData).forEach((key) => {
				set(newItem.json, key, setData[key]);
			});
		} else {
			Object.keys(setData).forEach((key) => {
				newItem.json[key] = setData[key];
			});
		}
	} else {
		newItem.json = setData;
	}

	return newItem;
};

export const parseJsonParameter = (jsonData: string | IDataObject, node: INode, i: number) => {
	let returnData: IDataObject;

	if (typeof jsonData === 'string') {
		try {
			returnData = jsonParse<IDataObject>(jsonData);
		} catch (error) {
			throw new NodeOperationError(node, `The item ${i + 1} contains invalid JSON`);
		}
	} else {
		returnData = jsonData;
	}

	if (returnData === undefined || typeof returnData !== 'object' || Array.isArray(returnData)) {
		throw new NodeOperationError(node, `'JSON Output' in item ${i + 1} is not a valid JSON object`);
	}

	return returnData;
};

export type SetField = {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	string?: string;
	number?: number;
	boolean?: boolean;
	array?: string[] | string | IDataObject | IDataObject[];
	object?: string | IDataObject;
};

export const prepareEntry = (entry: SetField, node: INode, i: number, ignoreErrors = false) => {
	let value = entry[entry.type];

	try {
		switch (entry.type) {
			case 'boolean':
				value = Boolean(value);
				break;
			case 'number':
				value = Number(value);
				break;
			case 'object':
				value = parseJsonParameter(value as string, node, i);
				break;
			case 'array':
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					value = [value];
				}
				if (typeof value === 'string') {
					value = value.split(',').map((item) => item.trim());
				}
				break;
			default:
				if (typeof value !== 'string') {
					value = String(value);
				}
		}
	} catch (error) {
		if (ignoreErrors) {
			return { name: entry.name, value: null };
		}
		throw new NodeOperationError(node, error as Error);
	}

	if (value === 'undefined' || (entry.type === 'number' && isNaN(value as number))) {
		if (ignoreErrors) {
			return { name: entry.name, value: null };
		} else {
			throw new NodeOperationError(
				node,
				`The value "${entry[entry.type]}" for the field "${
					entry.name
				}" could not be converted to a ${entry.type}`,
				{ itemIndex: i },
			);
		}
	}

	return { name: entry.name, value };
};
