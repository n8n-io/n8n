import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest, dataverseApiRequestAllItems } from '../GenericFunctions';
import { applyLookupBindings, resolveLookupFields } from '../operations/lookups';
import { createRow } from '../operations/createRow';
import { deleteRow } from '../operations/deleteRow';
import { getRow } from '../operations/getRow';
import { getManyRows } from '../operations/getManyRows';
import { updateRow } from '../operations/updateRow';
import { upsertRow } from '../operations/upsertRow';

vi.mock('../GenericFunctions', () => ({
	dataverseApiRequest: vi.fn(),
	dataverseApiRequestAllItems: vi.fn(),
}));

// Lookup translation is unit-tested in lookups.test.ts. Here we stub only the
// network-bound resolve/apply pair to a pass-through so the write-op assertions
// stay focused on request shape, while keeping the real `bodyHasLookupCandidates`
// gate + `EMPTY_LOOKUP_FIELDS` so the "skip metadata for plain bodies" behavior
// is exercised end-to-end.
vi.mock('../operations/lookups', async (importActual) => {
	const actual = await importActual<typeof import('../operations/lookups')>();
	return {
		...actual,
		resolveLookupFields: vi.fn().mockResolvedValue(new Map()),
		applyLookupBindings: vi.fn((_ctx: unknown, _i: number, body: unknown) => body),
	};
});

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';
const ROW_ID = '00000000-0000-0000-0000-000000000001';

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

		it('resolves lookup fields and translates the body when it carries a lookup-style value', async () => {
			withParams({
				entitySet: 'accounts',
				inputMode: 'json',
				fieldsJson: '{"primarycontactid":"00000000-0000-0000-0000-000000000001"}',
				createOptions: {},
			});

			await createRow.execute(ctx, 0, CREDENTIAL_TYPE);

			expect(resolveLookupFields).toHaveBeenCalledWith(ctx, CREDENTIAL_TYPE, 'accounts');
			expect(applyLookupBindings).toHaveBeenCalled();
		});

		it('skips lookup metadata for a body with only non-string scalars', async () => {
			withParams({
				entitySet: 'accounts',
				inputMode: 'json',
				fieldsJson: '{"revenue":100,"active":true}',
				createOptions: {},
			});

			await createRow.execute(ctx, 0, CREDENTIAL_TYPE);

			// No string / null value in the body → no metadata GETs, but the body
			// still passes through applyLookupBindings (prototype-pollution sanitizing).
			expect(resolveLookupFields).not.toHaveBeenCalled();
			expect(applyLookupBindings).toHaveBeenCalled();
		});

		it('resolves lookup metadata for a body with a plain string value', async () => {
			withParams({
				entitySet: 'accounts',
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				createOptions: {},
			});

			await createRow.execute(ctx, 0, CREDENTIAL_TYPE);

			// A plain string could be a mistyped lookup value; metadata read is
			// best-effort, so resolving it is safe even without permission.
			expect(resolveLookupFields).toHaveBeenCalledWith(ctx, CREDENTIAL_TYPE, 'accounts');
		});

		it('throws when the body is empty', async () => {
			withParams({ entitySet: 'accounts', inputMode: 'json', fieldsJson: '{}', createOptions: {} });

			await expect(createRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Create requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
			// The empty body is rejected before any lookup metadata is fetched.
			expect(resolveLookupFields).not.toHaveBeenCalled();
		});
	});

	describe('getRow', () => {
		it('GETs the record path and maps select/expand into the query string', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: ROW_ID,
				getOptions: { select: 'name', expand: 'primarycontactid', partitionId: 'partition-1' },
			});

			await getRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, , qs, , credType] = singleCall();
			expect(method).toBe('GET');
			expect(path).toBe(`/accounts(${ROW_ID})`);
			expect(qs).toMatchObject({
				$select: 'name',
				$expand: 'primarycontactid',
				partitionId: 'partition-1',
			});
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('throws for a whitespace-only record id before dispatching', async () => {
			withParams({ entitySet: 'accounts', recordId: '   ', getOptions: {} });

			await expect(getRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(/required/);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});

		it('resolves table and row resource locator values', async () => {
			withParams({
				entitySet: { mode: 'list', value: 'accounts' },
				recordId: { mode: 'list', value: ROW_ID },
				getOptions: {},
			});

			await getRow.execute(ctx, 0, CREDENTIAL_TYPE);

			expect(singleCall()[2]).toBe(`/accounts(${ROW_ID})`);
		});

		it('rejects a table name containing path traversal before dispatching', async () => {
			withParams({ entitySet: 'accounts\\..\\contacts', recordId: ROW_ID, getOptions: {} });

			await expect(getRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(/"entitySet"/);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('getManyRows', () => {
		it('rejects control characters in the table name before dispatching', async () => {
			withParams({ entitySet: 'accounts\n', returnAll: true, getAllOptions: {} });

			await expect(getManyRows.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(/"entitySet"/);
			expect(dataverseApiRequestAllItems).not.toHaveBeenCalled();
		});

		it('does not expose a Skip Token option', () => {
			const options = getManyRows.properties.find((property) => property.name === 'getAllOptions');

			expect(options?.options?.some((option) => option.name === 'skiptoken')).toBe(false);
		});

		it('pages with a limit and derives $orderby from column + direction', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 25,
				getAllOptions: {
					orderbyColumn: 'name',
					orderbyDirection: 'desc',
					filter: 'statecode eq 0',
				},
			});

			const result = await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			expect(result).toEqual([{ id: 'row-1' }]);
			const [, method, path, qs, limit, credType] = pagedCall();
			expect(method).toBe('GET');
			expect(path).toBe('/accounts');
			expect(qs).toMatchObject({ $orderby: 'name desc', $filter: 'statecode eq 0' });
			// Limit is mapped to a server-side $top so a full page isn't fetched.
			expect(qs).toMatchObject({ $top: 25 });
			expect(limit).toBe(25);
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('maps a Limit of 5,000 to $top', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 5000,
				getAllOptions: {},
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs, limit] = pagedCall();
			expect(qs).toMatchObject({ $top: 5000 });
			expect(limit).toBe(5000);
		});

		it('keeps server-driven paging for a Limit above 5,000', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 6000,
				getAllOptions: {},
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs, limit] = pagedCall();
			expect(qs).not.toHaveProperty('$top');
			expect(limit).toBe(6000);
		});

		it('lets an explicit Row Count override the limit-derived $top', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 25,
				getAllOptions: { top: 10 },
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs, limit] = pagedCall();
			expect(qs).toMatchObject({ $top: 10 });
			expect(limit).toBe(25);
		});

		it('uses limit 0 (unbounded) when returnAll is true', async () => {
			withParams({ entitySet: 'accounts', returnAll: true, getAllOptions: {} });

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs, limit] = pagedCall();
			expect(limit).toBe(0);
			// Return All must not cap the server page.
			expect(qs).not.toHaveProperty('$top');
		});

		it('forwards Row Count as $top', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: true,
				getAllOptions: { top: 250 },
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs] = pagedCall();
			expect(qs).toMatchObject({ $top: 250 });
		});

		it('ignores a stale saved Skip Token option', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: true,
				getAllOptions: { skiptoken: 'already%2Fencoded' },
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs] = pagedCall();
			expect(qs).not.toHaveProperty('$skiptoken');
		});

		it('rejects FetchXML queries when returnAll is enabled', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: true,
				getAllOptions: { fetchXml: '<fetch>x</fetch>' },
			});

			await expect(getManyRows.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				'FetchXML Query cannot be used with Return All because FetchXML pagination is not supported',
			);
			expect(dataverseApiRequestAllItems).not.toHaveBeenCalled();
		});

		it('forwards a limited FetchXML query verbatim and ignores OData options', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 25,
				getAllOptions: {
					fetchXml: '<fetch>x</fetch>',
					filter: 'ignored',
					select: ['ignored'],
				},
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, qs, limit] = pagedCall();
			expect(method).toBe('GET');
			expect(path).toBe('/accounts');
			expect(qs).toEqual({ fetchXml: '<fetch>x</fetch>' });
			expect(limit).toBe(25);
		});

		it('treats a whitespace-only FetchXML as unset and uses OData options', async () => {
			withParams({
				entitySet: 'accounts',
				returnAll: false,
				limit: 25,
				getAllOptions: { fetchXml: '   ', filter: 'statecode eq 0' },
			});

			await getManyRows.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, , , qs] = pagedCall();
			expect(qs).not.toHaveProperty('fetchXml');
			expect(qs).toMatchObject({ $filter: 'statecode eq 0', $top: 25 });
		});
	});

	describe('updateRow', () => {
		it('PATCHes with If-Match: * and return=representation', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: ROW_ID,
				inputMode: 'json',
				fieldsJson: '{"name":"New"}',
				updateOptions: {},
			});

			await updateRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, body, , headers, credType] = singleCall();
			expect(method).toBe('PATCH');
			expect(path).toBe(`/accounts(${ROW_ID})`);
			expect(body).toEqual({ name: 'New' });
			expect(headers?.['If-Match']).toBe('*');
			expect(headers?.Prefer).toBe('return=representation');
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('throws with the update-specific message when the body is empty', async () => {
			withParams({
				entitySet: 'accounts',
				recordId: ROW_ID,
				inputMode: 'json',
				fieldsJson: '{}',
				updateOptions: {},
			});

			await expect(updateRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Update requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
			// The empty body is rejected before any lookup metadata is fetched.
			expect(resolveLookupFields).not.toHaveBeenCalled();
		});
	});

	describe('upsertRow', () => {
		it('PATCHes by GUID with no precondition header for the default behavior', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: ROW_ID,
				inputMode: 'json',
				fieldsJson: '{"name":"Acme"}',
				upsertOptions: {},
			});

			await upsertRow.execute(ctx, 0, CREDENTIAL_TYPE);

			const [, method, path, body, , headers, credType] = singleCall();
			expect(method).toBe('PATCH');
			expect(path).toBe(`/accounts(${ROW_ID})`);
			expect(body).toEqual({ name: 'Acme' });
			expect(headers?.['If-Match']).toBeUndefined();
			expect(headers?.['If-None-Match']).toBeUndefined();
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('adds If-Match: * for updateOnly behavior', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: ROW_ID,
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
				recordId: ROW_ID,
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

			const [, , path, body] = singleCall();
			expect(path).toBe("/accounts(accountnumber='ACC-001')");
			expect(body).toEqual({ name: 'Acme' });
		});

		it('throws with the upsert-specific message when the body is empty', async () => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'guid',
				recordId: ROW_ID,
				inputMode: 'json',
				fieldsJson: '{}',
				upsertOptions: {},
			});

			await expect(upsertRow.execute(ctx, 0, CREDENTIAL_TYPE)).rejects.toThrow(
				/Create or Update requires at least one field/,
			);
			expect(dataverseApiRequest).not.toHaveBeenCalled();
			// The empty body is rejected before any lookup metadata is fetched.
			expect(resolveLookupFields).not.toHaveBeenCalled();
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

		it.each([
			"accountnumber='x\\..\\contacts(00000000-0000-0000-0000-000000000002'",
			"accountnumber='ACC\t001'",
			"accountnumber='ACC\n001'",
		])('rejects a URL-breaking alternate key before dispatching: %j', async (alternateKey) => {
			withParams({
				entitySet: 'accounts',
				identifierType: 'alternateKey',
				alternateKey,
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
			withParams({
				entitySet: 'accounts',
				recordId: ROW_ID,
				deleteOptions: { partitionId: 'partition-1' },
			});

			const result = (await deleteRow.execute(ctx, 0, CREDENTIAL_TYPE)) as IDataObject;

			expect(result).toEqual({ success: true, id: ROW_ID });
			const [, method, path, , qs, , credType] = singleCall();
			expect(method).toBe('DELETE');
			expect(path).toBe(`/accounts(${ROW_ID})`);
			expect(qs).toEqual({ partitionId: 'partition-1' });
			expect(credType).toBe(CREDENTIAL_TYPE);
		});

		it('returns the synthetic payload regardless of the request response', async () => {
			vi.mocked(dataverseApiRequest).mockResolvedValue({ unexpected: 'body' });
			withParams({ entitySet: 'accounts', recordId: ROW_ID, deleteOptions: {} });

			const result = (await deleteRow.execute(ctx, 0, CREDENTIAL_TYPE)) as IDataObject;

			expect(result).toEqual({ success: true, id: ROW_ID });
		});
	});
});
