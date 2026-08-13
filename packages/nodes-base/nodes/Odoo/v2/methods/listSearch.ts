import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { odooApiRequest } from '../transport';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain = filter ? [['name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, 'ir.model', 'search_read', {
		domain,
		fields: ['name', 'model'],
		limit: 60,
		offset: 0,
	})) as Array<{ name: string; model: string }>;

	return {
		results: response
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((m) => ({
				name: m.name,
				value: m.model,
				description: m.model,
			})),
	};
}

export async function searchCustomRecords(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const model = this.getNodeParameter('customResource', undefined, {
		extractValue: true,
	}) as string;

	if (!model) return { results: [] };

	const domain = filter ? [['display_name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, model, 'search_read', {
		domain,
		fields: ['id', 'display_name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; display_name: string }>;

	return {
		results: response.map((r) => ({
			name: r.display_name,
			value: r.id,
		})),
	};
}

export async function searchModelRecords(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const model = this.getNodeParameter('res_model', undefined, {
		extractValue: true,
	}) as string;

	if (!model) return { results: [] };

	const domain = filter ? [['display_name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, model, 'search_read', {
		domain,
		fields: ['id', 'display_name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; display_name: string }>;

	return {
		results: response.map((r) => ({
			name: r.display_name,
			value: r.id,
		})),
	};
}

export async function searchContacts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain = filter ? [['name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, 'res.partner', 'search_read', {
		domain,
		fields: ['id', 'name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return {
		results: response.map((r) => ({
			name: r.name,
			value: r.id,
		})),
	};
}

export async function searchOpportunities(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain = filter ? [['name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, 'crm.lead', 'search_read', {
		domain,
		fields: ['id', 'name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return {
		results: response.map((r) => ({
			name: r.name,
			value: r.id,
		})),
	};
}

export async function searchActivities(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain = filter ? [['summary', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, 'mail.activity', 'search_read', {
		domain,
		fields: ['id', 'summary', 'res_name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; summary: string; res_name: string }>;

	return {
		results: response.map((r) => ({
			name: r.summary || `Activity #${r.id}`,
			value: r.id,
			description: r.res_name,
		})),
	};
}

export async function searchActivityTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain = filter ? [['name', 'ilike', filter]] : [];

	const response = (await odooApiRequest.call(this, 'mail.activity.type', 'search_read', {
		domain,
		fields: ['id', 'name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return {
		results: response
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((t) => ({
				name: t.name,
				value: t.id,
			})),
	};
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const domain: unknown[] = [['active', '=', true]];
	if (filter) domain.push(['name', 'ilike', filter]);

	const response = (await odooApiRequest.call(this, 'res.users', 'search_read', {
		domain,
		fields: ['id', 'name'],
		limit: 60,
		offset: 0,
	})) as Array<{ id: number; name: string }>;

	return {
		results: response
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((u) => ({
				name: u.name,
				value: u.id,
			})),
	};
}
