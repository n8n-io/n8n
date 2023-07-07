import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import moment from 'moment';
import type { IQueryObject } from './interfaces';

// Query Functions
export function Eq(field: string, value: any): IQueryObject {
	return { _field: field, _value: value };
}

export function Gt(field: string, value: any): IQueryObject {
	return { _gt: { field: value } };
}

export function Gte(field: string, value: any): IQueryObject {
	return { _gte: { field: value } };
}

export function Lt(field: string, value: any): IQueryObject {
	return { _lt: { field: value } };
}

export function Lte(field: string, value: any): IQueryObject {
	return { _lte: { field: value } };
}
export function And(...criteria: IQueryObject[]): IQueryObject {
	return { _and: criteria };
}
export function Or(...criteria: IQueryObject[]): IQueryObject {
	return { _or: criteria };
}
export function Not(criteria: IQueryObject[]): IQueryObject {
	return { _not: criteria };
}

export function In(field: string, values: any[]): IQueryObject {
	return { _in: { _field: field, _values: values } };
}
export function Contains(field: string): IQueryObject {
	return { _contains: field };
}
export function Id(id: string | number): IQueryObject {
	return { _id: id };
}

export function Between(field: string, fromValue: any, toValue: any): IQueryObject {
	return { _between: { _field: field, _from: fromValue, _to: toValue } };
}
export function ParentId(tpe: string, id: string): IQueryObject {
	return { _parent: { _type: tpe, _id: id } };
}
export function Parent(tpe: string, criterion: IQueryObject): IQueryObject {
	return { _parent: { _type: tpe, _query: criterion } };
}
export function Child(tpe: string, criterion: IQueryObject): IQueryObject {
	return { _child: { _type: tpe, _query: criterion } };
}
export function Type(tpe: string): IQueryObject {
	return { _type: tpe };
}
export function queryString(query: string): IQueryObject {
	return { _string: query };
}
export function Like(field: string, value: string): IQueryObject {
	return { _like: { _field: field, _value: value } };
}
export function StartsWith(field: string, value: string) {
	if (!value.startsWith('*')) {
		value = value + '*';
	}
	return { _wildcard: { _field: field, _value: value } };
}
export function EndsWith(field: string, value: string) {
	if (!value.endsWith('*')) {
		value = '*' + value;
	}
	return { _wildcard: { _field: field, _value: value } };
}
export function ContainsString(field: string, value: string) {
	if (!value.endsWith('*')) {
		value = value + '*';
	}
	if (!value.startsWith('*')) {
		value = '*' + value;
	}
	return { _wildcard: { _field: field, _value: value } };
}

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
		if (['date', 'lastSyncDate', 'startDate', 'endDate'].includes(key)) {
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

export function buildCustomFieldSearch(customFields: IDataObject): IDataObject[] {
	const searchQueries: IDataObject[] = [];

	Object.keys(customFields).forEach((customFieldName) => {
		searchQueries.push(Eq(customFieldName, customFields[customFieldName]));
	});
	return searchQueries;
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

export function prepareRangeQuery(range: string, body: IDataObject) {
	if (range && range !== 'all') {
		(body.query as IDataObject[]).push({
			_name: 'page',
			from: parseInt(range.split('-')[0], 10),
			to: parseInt(range.split('-')[1], 10),
		});
	}
}

export function convertCustomFieldUiToObject(customFieldsUi: IDataObject) {
	const fieldsValues = customFieldsUi.values as IDataObject;
	if (Object.values(fieldsValues).length) {
		if (fieldsValues.jsonInput === true) {
			if (typeof fieldsValues.json === 'string') {
				let parsedFields = jsonParse<IDataObject>(fieldsValues.json);
				if (!Array.isArray(parsedFields) && parsedFields.customFields) {
					parsedFields = parsedFields.customFields as IDataObject;
				}
				return parsedFields;
			}
		} else {
			const values = (fieldsValues.customFields as IDataObject).values as IDataObject;
			if (values.fields) {
				const customFields: IDataObject = {};

				const fields = (values.fields as IDataObject).values as IDataObject[];
				if (fields.length) {
					for (const field of fields) {
						const fieldName = field.field as string;
						const fieldValue = field.value as string;

						customFields[fieldName] = fieldValue;
					}
				}

				return customFields;
			}
		}
	}
}
