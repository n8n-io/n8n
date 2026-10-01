import type {
	FieldType,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { odooApiRequest } from '../transport';

type OdooFieldType = string;

// Field types that are never writable in Odoo (computed relational sets)
const READ_ONLY_TYPES = new Set(['one2many', 'many2many']);

function mapOdooType(odooType: OdooFieldType): FieldType {
	switch (odooType) {
		case 'char':
		case 'text':
		case 'html':
		case 'many2one':
		case 'reference':
		case 'binary':
			return 'string';
		case 'integer':
		case 'float':
		case 'monetary':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'date':
		case 'datetime':
			return 'dateTime';
		case 'selection':
			return 'options';
		case 'many2many':
		case 'one2many':
			return 'array';
		default:
			return 'string';
	}
}

type OdooFieldSchema = {
	string: string;
	type: string;
	required: boolean;
	readonly: boolean;
	selection?: Array<[string, string]>;
};

async function getModelRMCFields(
	this: ILoadOptionsFunctions,
	model: string,
	requiredFields: Set<string> = new Set(),
): Promise<ResourceMapperFields> {
	const schema = (await odooApiRequest.call(this, model, 'fields_get', {
		attributes: ['string', 'type', 'required', 'readonly', 'selection'],
	})) as Record<string, OdooFieldSchema>;
	const operation = this.getNodeParameter('operation');
	const isCreate = operation === 'create';

	const fields: ResourceMapperField[] = Object.entries(schema)
		.map(([key, field]) => {
			const type = mapOdooType(field.type);

			const entry: ResourceMapperField = {
				id: key,
				displayName: field.string,
				required: isCreate && requiredFields.has(key),
				defaultMatch: false,
				canBeUsedToMatch: true,
				display: !field.readonly && !READ_ONLY_TYPES.has(field.type),
				removed: true,
				type,
			};

			if (field.type === 'selection' && Array.isArray(field.selection)) {
				entry.options = field.selection.map(([value, label]) => ({
					name: label,
					value,
				}));
			}

			return entry;
		})
		.sort((a, b) => a.displayName.localeCompare(b.displayName));

	return { fields };
}

export async function getOdooFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const model = this.getNodeParameter('customResource', undefined, {
		extractValue: true,
	}) as string;

	if (!model) return { fields: [] };

	return await getModelRMCFields.call(this, model);
}

export async function getContactFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return await getModelRMCFields.call(this, 'res.partner', new Set(['name']));
}

export async function getOpportunityFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await getModelRMCFields.call(this, 'crm.lead', new Set(['name']));
}

export async function getActivityFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await getModelRMCFields.call(this, 'mail.activity');
}
