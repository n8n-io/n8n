import get from 'lodash/get';
import set from 'lodash/set';
import { ApplicationError, type IDataObject } from 'n8n-workflow';

export function splitAndTrim(str: string | string[]) {
	if (typeof str === 'string') {
		return str
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag);
	}
	return str;
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
			returnData[key] = splitAndTrim(fields[key] as string);
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
				throw new ApplicationError(`Required field "${id}" is missing in item ${i}`, {
					level: 'warning',
				});
			}
		}
	}

	return returnData;
}

export function constructFilter(entry: IDataObject) {
	const { field, value } = entry;
	let { operator } = entry;

	if (operator === undefined) {
		operator = '_eq';
	}

	if (operator === '_between') {
		const { from, to } = entry;
		return {
			_between: {
				_field: field,
				_from: from,
				_to: to,
			},
		};
	}

	if (operator === '_in') {
		const { values } = entry;
		return {
			_in: {
				_field: field,
				_values: typeof values === 'string' ? splitAndTrim(values) : values,
			},
		};
	}

	return {
		[operator as string]: {
			_field: field,
			_value: value,
		},
	};
}
