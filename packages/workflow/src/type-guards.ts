import {
	type AssignmentCollectionValue,
	type AssignmentValue,
	type FilterValue,
	type INodeParameterResourceLocator,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type NodeConnectionType,
	type ResourceMapperValue,
	nodeConnectionTypes,
	type IBinaryData,
} from './interfaces';

export function isResourceLocatorValue(value: unknown): value is INodeParameterResourceLocator {
	return Boolean(
		typeof value === 'object' && value && 'mode' in value && 'value' in value && '__rl' in value,
	);
}

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

export const isAssignmentValue = (value: unknown): value is AssignmentValue => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'name' in value &&
		typeof value.name === 'string' &&
		'value' in value &&
		(!('type' in value) || typeof value.type === 'string')
	);
};

export const isAssignmentCollectionValue = (value: unknown): value is AssignmentCollectionValue => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'assignments' in value &&
		Array.isArray(value.assignments) &&
		value.assignments.every(isAssignmentValue)
	);
};

export const isFilterValue = (value: unknown): value is FilterValue => {
	return (
		typeof value === 'object' && value !== null && 'conditions' in value && 'combinator' in value
	);
};

export const isNodeConnectionType = (value: unknown): value is NodeConnectionType => {
	return nodeConnectionTypes.includes(value as NodeConnectionType);
};

export const isBinaryValue = (value: unknown): value is IBinaryData => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mimeType' in value &&
		('data' in value || 'id' in value)
	);
};
