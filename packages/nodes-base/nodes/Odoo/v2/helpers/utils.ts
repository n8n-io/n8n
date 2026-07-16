import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { odooApiRequest } from '../transport';

export function recordRLC(
	displayName: string,
	name: string,
	searchListMethod: string,
	description: string,
	dependsOn?: string[],
): INodeProperties {
	const prop: INodeProperties = {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 42',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9]+', errorMessage: 'Not a valid numeric ID' },
					},
				],
			},
		],
	};
	if (dependsOn?.length) {
		prop.typeOptions = { loadOptionsDependsOn: dependsOn };
	}
	return prop;
}

export const mapFilterOperators: Record<string, string> = {
	equal: '=',
	notEqual: '!=',
	greaterThen: '>',
	lesserThen: '<',
	greaterOrEqual: '>=',
	lesserOrEqual: '<=',
	like: 'like',
	in: 'in',
	notIn: 'not in',
	childOf: 'child_of',
};

export interface IOdooFilterItem {
	fieldName: string;
	operator: string;
	value: string;
}

export interface IOdooFilters {
	filter: IOdooFilterItem[];
}

export function odooGetDBName(databaseName: string | undefined, url: string): string {
	if (databaseName) return databaseName;
	const { hostname } = new URL(url);
	if (!hostname) return '';
	return hostname.split('.')[0];
}

const LIST_OPERATORS = new Set(['in', 'notIn']);

/**
 * Converts the filter fixedCollection value into an Odoo domain array.
 * e.g. [['email', '=', 'foo@bar.com'], ['name', 'like', 'foo']]
 *
 * For `in` / `not in` operators Odoo requires a list value, not a scalar.
 * Users enter comma-separated values which are split and coerced here.
 */
export type OdooFieldSchema = Record<string, { type: string }>;

/**
 * Fetches Odoo field type metadata for a model. Call once before the items
 * loop so every item reuses the same schema without extra API calls.
 */
export async function getModelSchema(
	ctx: IExecuteFunctions,
	model: string,
): Promise<OdooFieldSchema> {
	return (await odooApiRequest.call(ctx, model, 'fields_get', {
		attributes: ['type'],
	})) as OdooFieldSchema;
}

// n8n's resource mapper emits ISO 8601 strings with timezone for dateTime fields,
// e.g. "2026-07-14T12:00:00.000+02:00". Odoo expects "YYYY-MM-DD HH:MM:SS" (UTC)
// for datetime and "YYYY-MM-DD" for date fields.
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Converts ISO 8601 datetime/date strings in `fields` to the formats Odoo
 * expects, using the model schema to identify which fields need conversion.
 * Values already in Odoo format (e.g. "2026-07-14 12:00:00") are left as-is.
 */
export function formatOdooDateFields(fields: IDataObject, schema: OdooFieldSchema): IDataObject {
	const result = { ...fields };
	for (const [key, value] of Object.entries(result)) {
		if (typeof value !== 'string' || !(key in schema) || !ISO_8601_RE.test(value)) continue;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) continue;
		const odooType = schema[key].type;
		if (odooType === 'datetime') {
			// Odoo stores datetime in UTC; strip timezone and milliseconds
			result[key] = date
				.toISOString()
				.replace('T', ' ')
				.replace(/\.\d+Z$/, '');
		} else if (odooType === 'date') {
			// Preserve the date from the original input — no UTC conversion needed.
			// `toISOString()` would shift to UTC first, causing a day-off for positive offsets.
			result[key] = value.slice(0, 10);
		}
	}
	return result;
}

export function buildDomain(filters: IOdooFilters | undefined): unknown[][] {
	if (!filters?.filter?.length) return [];
	return filters.filter.map(({ fieldName, operator, value }) => {
		let resolvedValue: unknown = value;
		if (LIST_OPERATORS.has(operator)) {
			resolvedValue = String(value)
				.split(',')
				.map((v) => v.trim())
				.map((v) => (v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v));
		}
		return [fieldName, mapFilterOperators[operator] ?? operator, resolvedValue];
	});
}
