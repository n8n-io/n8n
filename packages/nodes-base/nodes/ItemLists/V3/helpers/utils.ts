import { NodeVM } from '@n8n/vm2';
import type {
	IDataObject,
	IExecuteFunctions,
	IBinaryData,
	INode,
	INodeExecutionData,
	GenericValue,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';

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
	throw new ApplicationError(
		`The \'${fieldName}\' parameter must be a string of fields separated by commas or an array of strings.`,
		{ level: 'warning' },
	);
};

const returnRegExp = /\breturn\b/g;

export function sortByCode(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): INodeExecutionData[] {
	const code = this.getNodeParameter('code', 0) as string;
	if (!returnRegExp.test(code)) {
		throw new NodeOperationError(
			this.getNode(),
			"Sort code doesn't return. Please add a 'return' statement to your code",
		);
	}

	const mode = this.getMode();
	const vm = new NodeVM({
		console: mode === 'manual' ? 'redirect' : 'inherit',
		sandbox: { items },
	});

	return vm.run(`module.exports = items.sort((a, b) => { ${code} })`);
}

type PartialBinaryData = Omit<IBinaryData, 'data'>;
const isBinaryUniqueSetup = () => {
	const binaries: PartialBinaryData[] = [];
	return (binary: IBinaryData) => {
		for (const existingBinary of binaries) {
			if (
				existingBinary.mimeType === binary.mimeType &&
				existingBinary.fileType === binary.fileType &&
				existingBinary.fileSize === binary.fileSize &&
				existingBinary.fileExtension === binary.fileExtension
			) {
				return false;
			}
		}

		binaries.push({
			mimeType: binary.mimeType,
			fileType: binary.fileType,
			fileSize: binary.fileSize,
			fileExtension: binary.fileExtension,
		});

		return true;
	};
};

export function addBinariesToItem(
	newItem: INodeExecutionData,
	items: INodeExecutionData[],
	uniqueOnly?: boolean,
) {
	const isBinaryUnique = uniqueOnly ? isBinaryUniqueSetup() : undefined;

	for (const item of items) {
		if (item.binary === undefined) continue;

		for (const key of Object.keys(item.binary)) {
			if (!newItem.binary) newItem.binary = {};
			let binaryKey = key;
			const binary = item.binary[key];

			if (isBinaryUnique && !isBinaryUnique(binary)) {
				continue;
			}

			// If the binary key already exists add a suffix to it
			let i = 1;
			while (newItem.binary[binaryKey] !== undefined) {
				binaryKey = `${key}_${i}`;
				i++;
			}

			newItem.binary[binaryKey] = binary;
		}
	}

	return newItem;
}

export function typeToNumber(value: GenericValue): number {
	if (typeof value === 'object') {
		if (Array.isArray(value)) return 9;
		if (value === null) return 10;
		if (value instanceof Date) return 11;
	}
	const types = {
		_string: 1,
		_number: 2,
		_bigint: 3,
		_boolean: 4,
		_symbol: 5,
		_undefined: 6,
		_object: 7,
		_function: 8,
	};
	return types[`_${typeof value}`];
}
