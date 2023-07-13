import type { IDataObject } from 'n8n-workflow';

import get from 'lodash/get';
import set from 'lodash/set';

export function splitTags<T>(tags: T) {
	if (typeof tags === 'string') {
		return tags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag);
	}
	return tags;
}

export function fixFieldType(fields: IDataObject) {
	const returnData: IDataObject = {};

	for (const key of Object.keys(fields)) {
		if (
			[
				'date',
				'lastSyncDate',
				'startDate',
				'endDate',
				'dueDate',
				'includeInTimeline',
				'sightedAt',
			].includes(key)
		) {
			returnData[key] = Date.parse(fields[key] as string);
			continue;
		}

		if (['tags', 'addTags', 'removeTags'].includes(key)) {
			returnData[key] = splitTags(fields[key]);
			continue;
		}

		returnData[key] = fields[key];
	}

	return returnData;
}

export function prepareInputItem(item: IDataObject, schema: IDataObject[], i: number) {
	const returnData: IDataObject = {};

	for (const entry of schema) {
		const id = entry.id as string;
		const value = get(item, id);

		if (value !== undefined) {
			set(returnData, id, value);
		} else {
			if (entry.required) {
				throw new Error(`Required field "${id}" is missing in item ${i}`);
			}
		}
	}

	return returnData;
}
