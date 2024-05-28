import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import {
	ApplicationError,
	NodeOperationError,
	deepCopy,
	jsonParse,
	validateFieldType,
} from 'n8n-workflow';

import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';

import { getResolvables, sanitazeDataPathKey } from '../../../../utils/utilities';
import type { SetNodeOptions } from './interfaces';
import { INCLUDE } from './interfaces';

const configureFieldHelper = (dotNotation?: boolean) => {
	if (dotNotation !== false) {
		return {
			set: (item: IDataObject, key: string, value: IDataObject) => {
				set(item, key, value);
			},
			get: (item: IDataObject, key: string) => {
				return get(item, key);
			},
			unset: (item: IDataObject, key: string) => {
				unset(item, key);
			},
		};
	} else {
		return {
			set: (item: IDataObject, key: string, value: IDataObject) => {
				item[sanitazeDataPathKey(item, key)] = value;
			},
			get: (item: IDataObject, key: string) => {
				return item[sanitazeDataPathKey(item, key)];
			},
			unset: (item: IDataObject, key: string) => {
				delete item[sanitazeDataPathKey(item, key)];
			},
		};
	}
};

export function composeReturnItem(
	this: IExecuteFunctions,
	itemIndex: number,
	inputItem: INodeExecutionData,
	newFields: IDataObject,
	options: SetNodeOptions,
) {
	const newItem: INodeExecutionData = {
		json: {},
		pairedItem: { item: itemIndex },
	};

	if (options.includeBinary && inputItem.binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		newItem.binary = {};
		Object.assign(newItem.binary, inputItem.binary);
	}

	const fieldHelper = configureFieldHelper(options.dotNotation);

	switch (options.include) {
		case INCLUDE.ALL:
			newItem.json = deepCopy(inputItem.json);
			break;
		case INCLUDE.SELECTED:
			const includeFields = (this.getNodeParameter('includeFields', itemIndex) as string)
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item);

			for (const key of includeFields) {
				const fieldValue = fieldHelper.get(inputItem.json, key) as IDataObject;
				let keyToSet = key;
				if (options.dotNotation !== false && key.includes('.')) {
					keyToSet = key.split('.').pop() as string;
				}
				fieldHelper.set(newItem.json, keyToSet, fieldValue);
			}
			break;
		case INCLUDE.EXCEPT:
			const excludeFields = (this.getNodeParameter('excludeFields', itemIndex) as string)
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item);

			const inputData = deepCopy(inputItem.json);

			for (const key of excludeFields) {
				fieldHelper.unset(inputData, key);
			}

			newItem.json = inputData;
			break;
		case INCLUDE.NONE:
			break;
		default:
			throw new ApplicationError(`The include option "${options.include}" is not known!`, {
				level: 'warning',
			});
	}

	for (const key of Object.keys(newFields)) {
		fieldHelper.set(newItem.json, key, newFields[key] as IDataObject);
	}

	return newItem;
}

export const parseJsonParameter = (
	jsonData: string | IDataObject,
	node: INode,
	i: number,
	entryName?: string,
) => {
	let returnData: IDataObject;
	const location = entryName ? `entry "${entryName}" inside 'Fields to Set'` : "'JSON Output'";

	if (typeof jsonData === 'string') {
		try {
			returnData = jsonParse<IDataObject>(jsonData);
		} catch (error) {
			let recoveredData = '';
			try {
				recoveredData = jsonData
					.replace(/'/g, '"') // Replace single quotes with double quotes
					.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Wrap keys in double quotes
					.replace(/,\s*([\]}])/g, '$1') // Remove trailing commas from objects
					.replace(/,+$/, ''); // Remove trailing comma
				returnData = jsonParse<IDataObject>(recoveredData);
			} catch (err) {
				const description =
					recoveredData === jsonData ? jsonData : `${recoveredData};\n Original input: ${jsonData}`;
				throw new NodeOperationError(node, `The ${location} in item ${i} contains invalid JSON`, {
					description,
				});
			}
		}
	} else {
		returnData = jsonData;
	}

	if (returnData === undefined || typeof returnData !== 'object' || Array.isArray(returnData)) {
		throw new NodeOperationError(
			node,
			`The ${location} in item ${i} does not contain a valid JSON object`,
		);
	}

	return returnData;
};

export const validateEntry = (
	name: string,
	type: FieldType,
	value: unknown,
	node: INode,
	itemIndex: number,
	ignoreErrors = false,
	nodeVersion?: number,
) => {
	if (nodeVersion && nodeVersion >= 3.2 && (value === undefined || value === null)) {
		return { name, value: null };
	}

	const description = `To fix the error try to change the type for the field "${name}" or activate the option “Ignore Type Conversion Errors” to apply a less strict type validation`;

	if (type === 'string') {
		if (nodeVersion && nodeVersion > 3 && (value === undefined || value === null)) {
			if (ignoreErrors) {
				return { name, value: null };
			} else {
				throw new NodeOperationError(
					node,
					`'${name}' expects a ${type} but we got '${String(value)}' [item ${itemIndex}]`,
					{ description },
				);
			}
		} else if (typeof value === 'object') {
			value = JSON.stringify(value);
		} else {
			value = String(value);
		}
	}

	const validationResult = validateFieldType(name, value, type);

	if (!validationResult.valid) {
		if (ignoreErrors) {
			return { name, value: value ?? null };
		} else {
			const message = `${validationResult.errorMessage} [item ${itemIndex}]`;
			throw new NodeOperationError(node, message, {
				itemIndex,
				description,
			});
		}
	}

	return {
		name,
		value: validationResult.newValue ?? null,
	};
};

export function resolveRawData(this: IExecuteFunctions, rawData: string, i: number) {
	const resolvables = getResolvables(rawData);
	let returnData: string = rawData;

	if (resolvables.length) {
		for (const resolvable of resolvables) {
			const resolvedValue = this.evaluateExpression(`${resolvable}`, i);

			if (typeof resolvedValue === 'object' && resolvedValue !== null) {
				returnData = returnData.replace(resolvable, JSON.stringify(resolvedValue));
			} else {
				returnData = returnData.replace(resolvable, resolvedValue as string);
			}
		}
	}
	return returnData;
}
