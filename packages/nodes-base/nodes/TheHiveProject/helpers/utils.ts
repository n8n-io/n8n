import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import moment from 'moment';

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

export function prepareOptional(optionals: IDataObject): IDataObject {
	const response: IDataObject = {};
	for (const key in optionals) {
		if (optionals[key] !== undefined && optionals[key] !== null && optionals[key] !== '') {
			if (['customFieldsJson', 'customFieldsUi'].indexOf(key) > -1) {
				continue; // Ignore customFields, they need special treatment
			} else if (moment(optionals[key] as string, moment.ISO_8601).isValid()) {
				response[key] = Date.parse(optionals[key] as string);
			} else if (key === 'artifacts') {
				try {
					response[key] = jsonParse(optionals[key] as string);
				} catch (error) {
					throw new Error('Invalid JSON for artifacts');
				}
			} else if (key === 'tags') {
				response[key] = splitTags(optionals[key] as string);
			} else {
				response[key] = optionals[key];
			}
		}
	}
	return response;
}

export function prepareSortQuery(sort: string, body: IDataObject) {
	if (sort) {
		const field = sort.substring(1);
		const value = sort.charAt(0) === '+' ? 'asc' : 'desc';
		const sortOption: IDataObject = {};
		sortOption[field] = value;
		(body.query as IDataObject[]).push({
			_name: 'sort',
			_fields: [sortOption],
		});
	}
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
