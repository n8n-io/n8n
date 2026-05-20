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

export const mapOdooResources: Record<string, string> = {
	contact: 'res.partner',
	opportunity: 'crm.lead',
	activity: 'mail.activity',
};

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
	const odooURL = new URL(url);
	const hostname = odooURL.hostname;
	if (!hostname) return '';
	return hostname.split('.')[0];
}

/**
 * Converts the filter fixedCollection value into an Odoo domain array.
 * e.g. [['email', '=', 'foo@bar.com'], ['name', 'like', 'foo']]
 */
export function buildDomain(filters: IOdooFilters | undefined): unknown[][] {
	if (!filters?.filter?.length) return [];
	return filters.filter.map(({ fieldName, operator, value }) => [
		fieldName,
		mapFilterOperators[operator] ?? operator,
		value,
	]);
}

/**
 * Flattens the nested address fixedCollection from additionalFields / updateFields
 * into root-level Odoo field keys.
 */
export function flattenAddressFields(fields: IDataObject): IDataObject {
	if (!fields.address) return fields;

	const addressFields = (fields.address as IDataObject).value as IDataObject | undefined;
	const { address: _removed, ...rest } = fields;

	return addressFields ? { ...rest, ...addressFields } : rest;
}
