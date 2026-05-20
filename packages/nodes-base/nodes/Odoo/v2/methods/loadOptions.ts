import { capitalCase } from 'change-case';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { odooApiRequest } from '../transport';

export async function getContactFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getModelFields.call(this, 'res.partner');
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, 'ir.model', 'search_read', {
		domain: [],
		fields: ['name', 'model'],
		limit: 0,
		offset: 0,
	})) as Array<{ name: string; model: string }>;

	return response
		.map((m) => ({ name: m.name, value: m.model, description: `Model: ${m.model}` }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, 'res.country.state', 'search_read', {
		domain: [],
		fields: ['id', 'name'],
		limit: 0,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return response
		.map((s) => ({ name: s.name, value: s.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, 'res.country', 'search_read', {
		domain: [],
		fields: ['id', 'name'],
		limit: 0,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return response
		.map((c) => ({ name: c.name, value: c.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
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

export async function getActivityTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, 'mail.activity.type', 'search_read', {
		domain: [],
		fields: ['id', 'name'],
		limit: 0,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return response
		.map((t) => ({ name: t.name, value: t.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await odooApiRequest.call(this, 'res.users', 'search_read', {
		domain: [['active', '=', true]],
		fields: ['id', 'name'],
		limit: 0,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return response
		.map((u) => ({ name: u.name, value: u.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
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
