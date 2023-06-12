import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, NodeOperationError, jsonParse, validateFieldType } from 'n8n-workflow';

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

export const prepareEntry = (
	entry: SetField,
	node: INode,
	itemIndex: number,
	ignoreErrors = false,
) => {
	const entryValue = entry[entry.type];
	const name = entry.name;

	if (ignoreErrors) {
		return { name, value: entryValue === undefined ? null : entryValue };
	}

	const validationResult = validateFieldType(name, entryValue, entry.type);

	if (!validationResult.valid) {
		throw new NodeOperationError(node, validationResult.errorMessage as string, {
			itemIndex,
		});
	}

	const value = validationResult.newValue === undefined ? null : validationResult.newValue;

	return { name, value };
};
