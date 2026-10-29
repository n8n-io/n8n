import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { formatOdooDateFields, hasDateCandidate, type OdooFieldSchema } from './utils';
import { odooApiRequest } from '../transport';

/**
 * Fetches Odoo field type metadata for a model.
 */
export async function getModelSchema(
	ctx: IExecuteFunctions,
	model: string,
): Promise<OdooFieldSchema> {
	return (await odooApiRequest.call(ctx, model, 'fields_get', {
		attributes: ['type'],
	})) as OdooFieldSchema;
}

/**
 * Returns a function that converts date values in `fields` to Odoo format.
 * It requests a model's schema only when `fields` contains a possible date value,
 * and at most once for each model. Call the returned function inside the per-item
 * `try` so that a failed schema request follows the node's `continueOnFail` setting.
 */
export function createDateFieldFormatter(ctx: IExecuteFunctions) {
	const schemaCache = new Map<string, OdooFieldSchema>();

	return async (model: string, fields: IDataObject): Promise<IDataObject> => {
		if (!hasDateCandidate(fields)) return fields;

		let schema = schemaCache.get(model);
		if (!schema) {
			schema = await getModelSchema(ctx, model);
			schemaCache.set(model, schema);
		}
		return formatOdooDateFields(fields, schema);
	};
}
