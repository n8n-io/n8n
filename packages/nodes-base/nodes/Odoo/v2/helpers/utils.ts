import { DateTime } from 'luxon';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

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

export type OdooFieldSchema = Record<string, { type: string }>;

// Odoo expects "YYYY-MM-DD HH:MM:SS" (UTC) for datetime and "YYYY-MM-DD" for date
// fields. Manually mapped dateTime fields arrive as Luxon DateTime objects, because
// the resource mapper validates them before `execute` runs. Auto-mapped input
// arrives as ISO 8601 strings, with or without a timezone offset.
const ODOO_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const ODOO_DATE_FORMAT = 'yyyy-MM-dd';
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const HAS_TZ_RE = /(Z|[+-]\d{2}:\d{2})$/;

function toValidDateTime(value: unknown): DateTime | undefined {
	if (DateTime.isDateTime(value)) return value.isValid ? value : undefined;
	if (value instanceof Date) {
		const dateTime = DateTime.fromJSDate(value, { zone: 'utc' });
		return dateTime.isValid ? dateTime : undefined;
	}
	return undefined;
}

/**
 * Returns true when at least one value in `fields` may need date conversion.
 * Callers use it to skip the schema request for writes without date values.
 */
export function hasDateCandidate(fields: IDataObject): boolean {
	return Object.values(fields).some(
		(value) =>
			toValidDateTime(value) !== undefined ||
			(typeof value === 'string' && ISO_8601_RE.test(value)),
	);
}

/**
 * Converts datetime/date values in `fields` to the formats Odoo expects, using
 * the model schema to identify which fields need conversion. Accepts Luxon
 * DateTime objects, JS Dates and ISO 8601 strings. Values already in Odoo
 * format (e.g. "2026-07-14 12:00:00") are left as-is.
 */
export function formatOdooDateFields(fields: IDataObject, schema: OdooFieldSchema): IDataObject {
	const result = { ...fields };
	for (const [key, value] of Object.entries(result)) {
		if (!(key in schema)) continue;
		const odooType = schema[key].type;
		if (odooType !== 'datetime' && odooType !== 'date') continue;

		const dateTime = toValidDateTime(value);
		if (dateTime) {
			// A date keeps the calendar day of its own zone, like the string path below
			result[key] =
				odooType === 'datetime'
					? dateTime.toUTC().toFormat(ODOO_DATETIME_FORMAT)
					: dateTime.toFormat(ODOO_DATE_FORMAT);
			continue;
		}

		if (typeof value !== 'string' || !ISO_8601_RE.test(value)) continue;
		if (odooType === 'datetime') {
			if (HAS_TZ_RE.test(value)) {
				// Offset / Z present — normalize to UTC for Odoo storage
				const date = new Date(value);
				if (Number.isNaN(date.getTime())) continue;
				result[key] = date
					.toISOString()
					.replace('T', ' ')
					.replace(/\.\d+Z$/, '');
			} else {
				// Naive ISO datetime — keep wall-clock time; `new Date()` would parse
				// as host-local and `toISOString()` would shift by the host timezone.
				result[key] = value.replace('T', ' ').replace(/\.\d+$/, '');
			}
		} else if (odooType === 'date') {
			// Preserve the date from the original input — no UTC conversion needed.
			// `toISOString()` would shift to UTC first, causing a day-off for positive offsets.
			result[key] = value.slice(0, 10);
		}
	}
	return result;
}

/**
 * Converts the filter fixedCollection value into an Odoo domain array.
 * e.g. [['email', '=', 'foo@bar.com'], ['name', 'like', 'foo']]
 *
 * For `in` / `not in` operators Odoo requires a list value, not a scalar.
 * Users enter comma-separated values which are split and coerced here.
 */
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
