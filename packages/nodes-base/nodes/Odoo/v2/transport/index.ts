import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, randomInt } from 'n8n-workflow';

import { odooGetDBName } from '../helpers/utils';

// ─── New API: POST /json/2/<model>/<method> (Odoo 19+) ───────────────────────
//
// Request body is a flat JSON object — the named kwargs of the ORM method.
// IDs for existing-record operations go in body.ids (not in positional args).
// Auth: Authorization: bearer <apiKey> header.
// Errors: HTTP 4xx/5xx (no response.error check needed).
// Docs: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html

async function callJson2(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	model: string,
	method: string,
	body: IDataObject,
): Promise<IDataObject | IDataObject[] | number | boolean> {
	const credentials = await this.getCredentials('odooApiKeyApi');
	const baseUrl = (credentials.url as string).replace(/\/$/, '');

	const headers: IDataObject = { 'Content-Type': 'application/json' };
	const db = odooGetDBName(credentials.db as string, baseUrl);
	if (db) headers['X-Odoo-Database'] = db;

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/json/2/${model}/${method}`,
		headers,
		body,
		json: true,
	};

	try {
		// httpRequestWithAuthentication applies the credential's authenticate config,
		// which adds "Authorization: bearer <apiKey>" automatically.
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'odooApiKeyApi',
			options,
		);
		return response as IDataObject | IDataObject[] | number | boolean;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// ─── Legacy API: /jsonrpc with login + execute (Odoo 14–18) ──────────────────
//
// The flat body from odooApiRequest is converted to the old positional-args
// format that execute() expects. Deprecated in Odoo 19; scheduled for removal
// in Odoo 22 (fall 2028) and Odoo Online 21.1 (winter 2027).

function bodyToRpcArgs(method: string, body: IDataObject): unknown[] {
	switch (method) {
		case 'create':
			// body.vals_list is [{...fields}]; legacy execute expects the vals dict directly
			return [(body.vals_list as IDataObject[])?.[0] ?? body];
		case 'read':
			return [body.ids, (body.fields as string[]) ?? []];
		case 'search_read':
			// undefined limit → omit from args so Odoo uses its default (no limit)
			return body.limit !== undefined
				? [body.domain ?? [], (body.fields as string[]) ?? [], body.offset ?? 0, body.limit]
				: [body.domain ?? [], (body.fields as string[]) ?? [], body.offset ?? 0];
		case 'write':
			// body = { ids: [N], vals: {...} }
			return [body.ids, body.vals ?? {}];
		case 'unlink':
			return [body.ids];
		case 'fields_get':
			return [[], (body.attributes as string[]) ?? []];
		case 'default_get':
			return [(body.fields_list as string[]) ?? []];
		default:
			return [body];
	}
}

async function getRpcUserID(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	db: string,
	username: string,
	password: string,
	baseUrl: string,
): Promise<number> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/jsonrpc`,
		headers: {
			Connection: 'keep-alive',
			Accept: '*/*',
			'Content-Type': 'application/json',
		},
		body: {
			jsonrpc: '2.0',
			method: 'call',
			id: randomInt(100),
			params: { service: 'common', method: 'login', args: [db, username, password] },
		},
		json: true,
	};

	const response = await this.helpers.httpRequest(options);
	if (response.error) {
		throw new NodeApiError(this.getNode(), response.error.data as JsonObject, {
			message: response.error.data.message,
		});
	}
	return response.result as number;
}

async function rpcRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	model: string,
	method: string,
	body: IDataObject,
): Promise<IDataObject | IDataObject[] | number | boolean> {
	const credentials = await this.getCredentials('odooApi');
	const baseUrl = (credentials.url as string).replace(/\/$/, '');
	const username = credentials.username as string;
	const password = credentials.password as string;
	const db = odooGetDBName(credentials.db as string, baseUrl);

	const userID = await getRpcUserID.call(this, db, username, password, baseUrl);
	const args = bodyToRpcArgs(method, body);

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/jsonrpc`,
		headers: {
			Connection: 'keep-alive',
			Accept: '*/*',
			'Content-Type': 'application/json',
		},
		body: {
			jsonrpc: '2.0',
			method: 'call',
			id: randomInt(100),
			params: {
				service: 'object',
				method: 'execute',
				args: [db, userID, password, model, method, ...args],
			},
		},
		json: true,
	};

	try {
		const response = await this.helpers.httpRequest(options);
		if (response.error) {
			throw new NodeApiError(this.getNode(), response.error.data as JsonObject, {
				message: response.error.data.message,
			});
		}
		return response.result as IDataObject | IDataObject[] | number | boolean;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// ─── Unified facade ───────────────────────────────────────────────────────────

/**
 * Dispatch an Odoo model method call through the correct protocol.
 *
 * The `body` parameter is the flat JSON body as expected by the new
 * `/json/2/<model>/<method>` endpoint (Odoo 19+). For legacy credentials,
 * the body is internally converted to positional args for `/jsonrpc`.
 *
 * Body conventions:
 * - create:      body = { name, email, ... }        (ORM method kwargs)
 * - read:        body = { ids: [N], fields: [...] }
 * - search_read: body = { domain: [...], fields, limit, offset }
 * - write:       body = { ids: [N], name: '...', email: '...' }
 * - unlink:      body = { ids: [N] }
 * - fields_get:  body = { attributes: ['string', 'type', ...] }
 *
 * Return types from Odoo 19 /json/2:
 * - create  → integer (new record ID)
 * - write   → true
 * - unlink  → true
 * - read / search_read / fields_get → array / object
 */
export async function odooApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	model: string,
	method: string,
	body: IDataObject,
): Promise<IDataObject | IDataObject[] | number | boolean> {
	const authentication = this.getNodeParameter('authentication', 0, 'odooApiKeyApi') as string;

	if (authentication === 'odooApiKeyApi') {
		return await callJson2.call(this, model, method, body);
	}

	return await rpcRequest.call(this, model, method, body);
}
