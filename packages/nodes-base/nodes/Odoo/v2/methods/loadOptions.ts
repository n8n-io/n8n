import { capitalCase } from 'change-case';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { odooApiRequest } from '../transport';

export async function getContactFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getModelFields.call(this, 'res.partner');
}

export async function getOpportunityFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getModelFields.call(this, 'crm.lead');
}

export async function getActivityFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getModelFields.call(this, 'mail.activity');
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function getModelFields(
	this: ILoadOptionsFunctions,
	model: string,
): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, model, 'fields_get', {
		attributes: ['string', 'type', 'required'],
	})) as Record<string, { string: string; type: string; required: boolean }>;

	return Object.entries(response)
		.map(([key, field]) => {
			let displayName = field.string;
			try {
				displayName = capitalCase(field.string);
			} catch {}
			return {
				name: displayName,
				value: key,
				// nodelinter-ignore-next-line
				description: `name: ${key}, type: ${field.type}, required: ${field.required}`,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}
