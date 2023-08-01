import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError, jsonParse, validateFieldType } from 'n8n-workflow';

import set from 'lodash/set';

import type { SetNodeOptions, SetField } from './interfaces';
import { INCLUDE } from './interfaces';

export const configureFieldSetter = (dotNotation?: boolean) => {
	if (dotNotation !== false) {
		return (item: IDataObject, key: string, value: IDataObject) => {
			set(item, key, value);
		};
	} else {
		return (item: IDataObject, key: string, value: IDataObject) => {
			item[key] = value;
		};
	}
};

export function prepareItem(
	this: IExecuteFunctions,
	itemIndex: number,
	inputItem: INodeExecutionData,
	newFields: IDataObject,
	options: SetNodeOptions,
) {
	const newItem: INodeExecutionData = {
		json: {},
		pairedItem: inputItem.pairedItem,
	};

	if (options.includeBinary && inputItem.binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		newItem.binary = {};
		Object.assign(newItem.binary, inputItem.binary);
	}

	const fieldSetter = configureFieldSetter(options.dotNotation);

	switch (options.include) {
		case INCLUDE.ALL:
			newItem.json = deepCopy(inputItem.json);
			break;
		case INCLUDE.SELECTED:
			const includeFields = (this.getNodeParameter('includeFields', itemIndex) as string)
				.split(',')
				.map((item) => item.trim());

			for (const key of includeFields) {
				fieldSetter(newItem.json, key, inputItem.json[key] as IDataObject);
			}
			break;
		case INCLUDE.EXCEPT:
			const excludeFields = (this.getNodeParameter('excludeFields', itemIndex) as string)
				.split(',')
				.map((item) => item.trim());

			for (const key of Object.keys(inputItem.json)) {
				if (excludeFields.includes(key)) continue;
				fieldSetter(newItem.json, key, inputItem.json[key] as IDataObject);
			}
			break;
		case INCLUDE.NONE:
			break;
		default:
			throw new Error(`The include option "${options.include}" is not known!`);
	}

	for (const key of Object.keys(newFields)) {
		fieldSetter(newItem.json, key, newFields[key] as IDataObject);
	}

	return newItem;
}

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

export const prepareEntry = (
	entry: SetField,
	node: INode,
	itemIndex: number,
	ignoreErrors = false,
) => {
	const entryValue = entry[entry.type];
	const name = entry.name;
	const entryType = entry.type.replace('Value', '') as FieldType;

	const validationResult = validateFieldType(name, entryValue, entryType);

	if (!validationResult.valid) {
		if (ignoreErrors) {
			validationResult.newValue = entryValue;
		} else {
			throw new NodeOperationError(node, validationResult.errorMessage as string, {
				itemIndex,
			});
		}
	}

	const value = validationResult.newValue === undefined ? null : validationResult.newValue;

	return { name, value };
};
