// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest, dataverseApiRequestAllItems } from '../GenericFunctions';
import { createRow } from '../operations/createRow';
import { deleteRow } from '../operations/deleteRow';
import { getRow } from '../operations/getRow';
import { listRows } from '../operations/listRows';
import { updateRow } from '../operations/updateRow';
import { upsertRow } from '../operations/upsertRow';

vi.mock('../GenericFunctions', () => ({
	dataverseApiRequest: vi.fn(),
	dataverseApiRequestAllItems: vi.fn(),
}));

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';

const node: INode = {
	id: 'test-node',
	name: 'Microsoft Dataverse',
	type: 'n8n-nodes-base.microsoftDataverse',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Microsoft Dataverse operations', () => {
	let ctx: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	/**
	 * Drive `ctx.getNodeParameter(name, index, fallback)` from a plain map,
	 * honoring the caller's fallback when a key is absent — mirrors n8n's real
	 * behavior so each op's optional-param defaults are exercised.
	 */
	const withParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	/** Args passed to the single-shot request: [ctx, method, path, body, qs, headers, credType]. */
	const singleCall = () => vi.mocked(dataverseApiRequest).mock.calls[0]!;
	/** Args passed to the paged request: [ctx, method, path, qs, limit, credType, headers]. */
	const pagedCall = () => vi.mocked(dataverseApiRequestAllItems).mock.calls[0]!;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(node);
		vi.mocked(dataverseApiRequest).mockResolvedValue({ id: 'row-1' });
		vi.mocked(dataverseApiRequestAllItems).mockResolvedValue([{ id: 'row-1' }]);
	});

	describe('createRow', () => {
		it('POSTs the parsed body with return=representation', async () => {
			withParams({
				entitySet: 'accounts',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				createOptions: {},
			});

			const result = await createRow.execute(ctx, 0, CREDENTIAL_TYPE);

			expect(result).toEqual({ id: 'row-1' });
			const [, method, path, body, , headers, credType] = singleCall();
			expect(method).toBe('POST');
			expect(path).toBe('/accounts');
			expect(body).toEqual({ name: 'Acme' });
			expect(headers?.Prefer).toBe('return=representation');
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('throws when the body is empty', async () => {
			withParams({ entitySet: 'accounts', inputMode: 'json', fieldsJson: '{}', createOptions: {} });

			await expect(createRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Add a New Row requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('getRow', () => {
		it('GETs the record path and maps select/expand into the query string', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: 'abc-123',
				getOptions: { select: 'name', expand: 'primarycontactid' },
			});

			await getRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, , qs, , credType] = singleCall();
			expect(method).toBe('GET');
			expect(path).toBe('/accounts(abc-123)');
			expect(qs).toMatchObject({ $select: 'name', $expand: 'primarycontactid' });
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('throws for a whitespace-only record id before dispatching', async () => {
			withParams({ entitySet: 'accounts', recordId: '   ', getOptions: {} });

			await expect(getRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(/required/);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('listRows', () => {
		it('pages with a limit and derives $orderby from column + direction', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 25,
				listOptions: { orderbyColumn: 'name', orderbyDirection: 'desc', filter: 'statecode eq 0' },
			});

			const result = await listRows.execute(ctx, 0, CREDENTIAL_TYPE);

			expect(result).toEqual([{ id: 'row-1' }]);
			const [, method, path, qs, limit, credType] = pagedCall();
			expect(method).toBe('GET');
			expect(path).toBe('/accounts');
			expect(qs).toMatchObject({ $orderby: 'name desc', $filter: 'statecode eq 0' });
			expect(limit).toBe(25);
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('uses limit 0 (unbounded) when returnAll is true', async () => {
			withParams({ entitySet: 'accounts', returnAll: true, listOptions: {} });

			await listRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , , limit] = pagedCall();
			expect(limit).toBe(0);
		});

		it('forwards a FetchXML query verbatim and ignores OData options', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: true,
				listOptions: { fetchXml: '<fetch>x</fetch>', filter: 'ignored' },
			});

			await listRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs] = pagedCall();
			expect(qs).toEqual({ fetchXml: '<fetch>x</fetch>' });
		});
	});

	describe('updateRow', () => {
		it('PATCHes with If-Match: * and return=representation', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{"name":"New"}',
				updateOptions: {},
			});

			await updateRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, body, , headers, credType] = singleCall();
			expect(method).toBe('PATCH');
			expect(path).toBe('/accounts(abc-123)');
			expect(body).toEqual({ name: 'New' });
			expect(headers?.['If-Match']).toBe('*');
			expect(headers?.Prefer).toBe('return=representation');
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('throws with the update-specific message when the body is empty', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{}',
				updateOptions: {},
			});

			await expect(updateRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Update a Row requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('upsertRow', () => {
		it('PATCHes by GUID with no precondition header for the default behavior', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: {},
			});

			await upsertRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, , , headers, credType] = singleCall();
			expect(method).toBe('PATCH');
			expect(path).toBe('/accounts(abc-123)');
			expect(headers?.['If-Match']).toBeUndefined();
			expect(headers?.['If-None-Match']).toBeUndefined();
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('adds If-Match: * for updateOnly behavior', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: { behavior: 'updateOnly' },
			});

			await upsertRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , , , headers] = singleCall();
			expect(headers?.['If-Match']).toBe('*');
		});

		it('adds If-None-Match: * for createOnly behavior', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: { behavior: 'createOnly' },
			});

			await upsertRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , , , headers] = singleCall();
			expect(headers?.['If-None-Match']).toBe('*');
		});

		it('addresses the row by an alternate-key predicate', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'alternateKey',
				alternateKey: "accountnumber='ACC-001'",
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: {},
			});

			await upsertRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , path] = singleCall();
			expect(path).toBe("/accounts(accountnumber='ACC-001')");
		});

		it('throws with the upsert-specific message when the body is empty', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: 'abc-123',
				inputMode: 'json',
				fieldsJson: '{}',
				upsertOptions: {},
			});

			await expect(upsertRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Upsert a Row requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});

		it('throws naming the alternate-key parameter when it is empty', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'alternateKey',
				alternateKey: '   ',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: {},
			});

			await expect(upsertRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(/"alternateKey"/);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('deleteRow', () => {
		it('DELETEs the record path and returns a synthetic success payload', async () => {
			withParams({ entitySet: 'accounts', recordId: 'abc-123', deleteOptions: {} });

			const result = (await deleteRow.execute(ctx, 0, CREDENTIAL_TYPE)) as IDataObject;

			expect(result).toEqual({ success: true, id: 'abc-123' });
			const [, method, path, , , , credType] = singleCall();
			expect(method).toBe('DELETE');
			expect(path).toBe('/accounts(abc-123)');
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('returns the synthetic payload regardless of the request response', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({ unexpected: 'body' });
			withParams({ entitySet: 'accounts', recordId: 'abc-123', deleteOptions: {} });

			const result = (await deleteRow.execute(ctx, 0, CREDENTIAL_TYPE)) as IDataObject;

			expect(result).toEqual({ success: true, id: 'abc-123' });
		});
	});
});
