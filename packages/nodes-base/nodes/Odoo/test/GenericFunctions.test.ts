import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';

jest.mock(
	'n8n-workflow',
	() => ({
		NodeApiError: class NodeApiError extends Error {},
		NodeConnectionTypes: {
			Main: 'main',
		},
		deepCopy: jest.fn((data) => data),
		randomInt: jest.fn(() => 1),
	}),
	{ virtual: true },
);

import { Odoo } from '../Odoo.node';
import {
	getOdooDatabaseNameFromJsonRpcBody,
	odooJSONRPCRequest,
} from '../GenericFunctions';

const getLastRequestOptions = (request: jest.Mock): IRequestOptions => {
	return request.mock.calls[request.mock.calls.length - 1][0] as IRequestOptions;
};

const getRequestHeaders = (request: jest.Mock): IDataObject => {
	return getLastRequestOptions(request).headers as IDataObject;
};

const createMockExecuteFunctions = () => {
	const request = jest.fn().mockResolvedValue({ result: { success: true } });
	const executeFunctions = {
		helpers: {
			request,
		},
		getNode: jest.fn().mockReturnValue({ name: 'Odoo' }),
	} as unknown as IExecuteFunctions;

	return { executeFunctions, request };
};

const createJsonRpcBody = (db: unknown): IDataObject => ({
	jsonrpc: '2.0',
	method: 'call',
	params: {
		service: 'object',
		method: 'execute',
		args: [db, 1, 'password', 'res.partner', 'search_read', [], ['id', 'name']],
	},
	id: 1,
});

const runCredentialTest = async (data: IDataObject) => {
	const request = jest.fn().mockResolvedValue({ result: 1 });
	const credentialTestFunctions = {
		helpers: {
			request,
		},
	} as unknown as ICredentialTestFunctions;
	const odoo = new Odoo();

	const result = await odoo.methods.credentialTest.odooApiTest.call(credentialTestFunctions, {
		data,
	} as ICredentialsDecrypted);

	return { request, result };
};

describe('Odoo GenericFunctions', () => {
	describe('getOdooDatabaseNameFromJsonRpcBody', () => {
		it('returns the database name when body.params.args[0] is a non-empty string', () => {
			expect(getOdooDatabaseNameFromJsonRpcBody(createJsonRpcBody('odoo'))).toBe('odoo');
		});

		it.each([
			['params are missing', {}],
			['args are missing', { params: {} }],
			['database value is missing', { params: { args: [] } }],
			['database value is empty', createJsonRpcBody('')],
			['database value is only whitespace', createJsonRpcBody('   ')],
			['database value is not a string', createJsonRpcBody(123)],
		])('returns undefined when %s', (_, body) => {
			expect(getOdooDatabaseNameFromJsonRpcBody(body as IDataObject)).toBeUndefined();
		});
	});

	describe('odooJSONRPCRequest', () => {
		it('sets the X-Odoo-Database header when body.params.args[0] is a non-empty string', async () => {
			const { executeFunctions, request } = createMockExecuteFunctions();

			await odooJSONRPCRequest.call(executeFunctions, createJsonRpcBody('odoo'), 'https://odoo.test');

			expect(getRequestHeaders(request)).toEqual(
				expect.objectContaining({
					'X-Odoo-Database': 'odoo',
				}),
			);
		});

		it.each([
			['params are missing', {}],
			['args are missing', { params: {} }],
			['database value is missing', { params: { args: [] } }],
			['database value is empty', createJsonRpcBody('')],
			['database value is only whitespace', createJsonRpcBody('   ')],
			['database value is not a string', createJsonRpcBody(123)],
		])('omits the X-Odoo-Database header when %s', async (_, body) => {
			const { executeFunctions, request } = createMockExecuteFunctions();

			await odooJSONRPCRequest.call(executeFunctions, body as IDataObject, 'https://odoo.test');

			expect(getRequestHeaders(request)).not.toHaveProperty('X-Odoo-Database');
		});
	});

	describe('credential test', () => {
		it('sets the X-Odoo-Database header when the credential database resolves to a non-empty string', async () => {
			const { request, result } = await runCredentialTest({
				db: 'odoo',
				url: 'https://odoo.test',
				username: 'admin',
				password: 'password',
			});

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful!',
			});
			expect(getRequestHeaders(request)).toEqual(
				expect.objectContaining({
					'X-Odoo-Database': 'odoo',
				}),
			);
		});

		it.each([
			['database value is missing', { url: 'file:///tmp' }],
			['database value is empty', { db: '', url: 'file:///tmp' }],
			['database value is not a string', { db: 123, url: 'https://odoo.test' }],
		])('omits the X-Odoo-Database header when the credential %s', async (_, credentials) => {
			const { request, result } = await runCredentialTest({
				...credentials,
				username: 'admin',
				password: 'password',
			});

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful!',
			});
			expect(getRequestHeaders(request)).not.toHaveProperty('X-Odoo-Database');
		});
	});
});
