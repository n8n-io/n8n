import { NodeApiError, randomInt } from 'n8n-workflow';
import { odooGetDBName } from '../helpers/utils';
// ─── New API: POST /json/2/<model>/<method> (Odoo 19+) ───────────────────────
//
// Request body is a flat JSON object — the named kwargs of the ORM method.
// IDs for existing-record operations go in body.ids (not in positional args).
// Auth: Authorization: bearer <apiKey> header.
// Errors: HTTP 4xx/5xx (no response.error check needed).
// Docs: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
async function callJson2(model, method, body) {
    const credentials = await this.getCredentials('odooApiKeyApi');
    const baseUrl = credentials.url.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    const db = odooGetDBName(credentials.db, baseUrl);
    if (db)
        headers['X-Odoo-Database'] = db;
    const options = {
        method: 'POST',
        url: `${baseUrl}/json/2/${model}/${method}`,
        headers,
        body,
        json: true,
    };
    try {
        // httpRequestWithAuthentication applies the credential's authenticate config,
        // which adds "Authorization: bearer <apiKey>" automatically.
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'odooApiKeyApi', options);
        return response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
// ─── Legacy API: /jsonrpc with login + execute (Odoo 14–18) ──────────────────
//
// The flat body from odooApiRequest is converted to the old positional-args
// format that execute() expects. Deprecated in Odoo 19; scheduled for removal
// in Odoo 22 (fall 2028) and Odoo Online 21.1 (winter 2027).
export function bodyToRpcArgs(method, body) {
    switch (method) {
        case 'create':
            // body.vals_list is [{...fields}]; legacy execute expects the vals dict directly.
            return [body.vals_list?.[0] ?? body];
        case 'read':
            return [body.ids, body.fields ?? []];
        case 'search_read':
            // undefined limit → omit from args so Odoo uses its default (no limit)
            return body.limit !== undefined
                ? [body.domain ?? [], body.fields ?? [], body.offset ?? 0, body.limit]
                : [body.domain ?? [], body.fields ?? [], body.offset ?? 0];
        case 'write':
            // body = { ids: [N], vals: {...} }
            return [body.ids, body.vals ?? {}];
        case 'unlink':
            return [body.ids];
        case 'fields_get':
            return [[], body.attributes ?? []];
        case 'default_get':
            return [body.fields_list ?? []];
        default:
            return [body];
    }
}
async function getRpcUserID(db, username, password, baseUrl) {
    const options = {
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
        throw new NodeApiError(this.getNode(), response.error.data, {
            message: response.error.data.message,
        });
    }
    return response.result;
}
async function rpcRequest(model, method, body) {
    const credentials = await this.getCredentials('odooApi');
    const baseUrl = credentials.url.replace(/\/$/, '');
    const username = credentials.username;
    const password = credentials.password;
    const db = odooGetDBName(credentials.db, baseUrl);
    const userID = await getRpcUserID.call(this, db, username, password, baseUrl);
    const args = bodyToRpcArgs(method, body);
    const options = {
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
            throw new NodeApiError(this.getNode(), response.error.data, {
                message: response.error.data.message,
            });
        }
        return response.result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
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
 * - create:      body = { vals_list: [{ name, email, ... }] }
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
export async function odooApiRequest(model, method, body) {
    const authentication = this.getNodeParameter('authentication', 0, 'odooApiKeyApi');
    if (authentication === 'odooApiKeyApi') {
        return await callJson2.call(this, model, method, body);
    }
    return await rpcRequest.call(this, model, method, body);
}
//# sourceMappingURL=index.js.map