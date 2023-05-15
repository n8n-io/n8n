import type {
	INodeProperties,
	INodePropertyOptions,
	INodePropertyCollection,
	INodeParameterResourceLocator,
	ResourceMapperValue,
} from './Interfaces';

export const isINodeProperties = (
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodeProperties => 'name' in item && 'type' in item && !('value' in item);

export const isINodePropertyOptions = (
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodePropertyOptions => 'value' in item && 'name' in item && !('displayName' in item);

export const isINodePropertyCollection = (
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodePropertyCollection => 'values' in item && 'name' in item && 'displayName' in item;

export const isINodePropertiesList = (
	items: INodeProperties['options'],
): items is INodeProperties[] => Array.isArray(items) && items.every(isINodeProperties);

export const isINodePropertyOptionsList = (
	items: INodeProperties['options'],
): items is INodePropertyOptions[] => Array.isArray(items) && items.every(isINodePropertyOptions);

export const isINodePropertyCollectionList = (
	items: INodeProperties['options'],
): items is INodePropertyCollection[] => {
	return Array.isArray(items) && items.every(isINodePropertyCollection);
};

export const isValidResourceLocatorParameterValue = (
	value: INodeParameterResourceLocator,
): boolean => {
	if (typeof value === 'object') {
		if (typeof value.value === 'number') {
			return true; // Accept all numbers
		}
		return !!value.value;
	} else {
		return !!value;
	}
};

export const isResourceMapperValue = (value: unknown): value is ResourceMapperValue => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mappingMode' in value &&
		'schema' in value &&
		'value' in value
	);
};

export const isNumeric = (value: unknown): value is number => {
	return !isNaN(Number(value));
};

export const isBoolean = (value: unknown): value is boolean => {
	if (typeof value === 'boolean') {
		return true;
	}

	if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
		return true;
	}

	const num = Number(value);
	if (num === 0) {
		return false;
	} else if (num === 1) {
		return true;
	}
	return false;
};

export const isDateTime = (value: unknown): value is Date => {
	const d = new Date(String(value));
	return d instanceof Date && !isNaN(d.valueOf());
};

export const isTime = (value: unknown): value is string => {
	return /\d{2}:\d{2}(:\d{2})?(\-|\+\d{4})?/s.test(String(value));
};

export const isArray = (value: unknown): value is unknown[] => {
	try {
		return Array.isArray(JSON.parse(`[${String(value)}]`));
	} catch (e) {
		return false;
	}
};

export const isObject = (value: unknown): value is object => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const o = JSON.parse(String(value));

		return !isArray(o);
	} catch (e) {}
	return false;
};
