import { INodeProperties, INodePropertyOptions, INodePropertyCollection } from './Interfaces';

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
