import type { IDataObject, INode, IPollFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { sleep } from '@n8n/utils/sleep';
import { mockDeep } from 'vitest-mock-extended';

import { SERVICE_PRINCIPAL_AUTH } from '../../transport';
import type { DeltaPage, DeltaRequest } from '../../transport/delta';
import { DEFAULT_DELTA_MAX_PAGES, microsoftApiRequestDelta } from '../../transport/delta';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const GRAPH = 'https://graph.microsoft.com';
const DRIVE = { feed: 'driveItem', driveId: 'b!drive-id' } as const;
const SITE_ID =
	'contoso.sharepoint.com,11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222';
const LIST = { feed: 'listItem', siteId: SITE_ID, listId: 'list-guid' } as const;

const next = (n: number, value: IDataObject[] = []) => ({
	value,
	'@odata.nextLink': `${GRAPH}/p${n}`,
});
const done = (value: IDataObject[] = []) => ({ value, '@odata.deltaLink': `${GRAPH}/done` });

const graphError = (status: number, code?: string, retryAfterSeconds?: string) =>
	Object.assign(new Error('request failed'), {
		statusCode: status,
		httpCode: `${status}`,
		...(code ? { error: { error: { code, message: 'Resync required.' } } } : {}),
		...(retryAfterSeconds ? { headers: { 'retry-after': retryAfterSeconds } } : {}),
	});

describe('microsoftApiRequestDelta', () => {
	let ctx: Mocked<IPollFunctions>;
	let request: Mock;

	const optionsOf = (call: number) => request.mock.calls[call][1] as Record<string, unknown>;

	const authenticateAs = (type: string) =>
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i?: number, fallback?: unknown) =>
				(name === 'authentication' ? type : fallback) as never,
		);

	const run = async (overrides: Partial<DeltaRequest> = {}) =>
		await microsoftApiRequestDelta.call(ctx, { ...DRIVE, ...overrides } as DeltaRequest);

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IPollFunctions>();
		request = vi.fn();
		ctx.helpers.requestOAuth2 = request;
		ctx.helpers.requestWithAuthentication = request;
		ctx.getNode.mockReturnValue({
			id: 'n',
			name: 'SharePoint Trigger',
			type: 'n8n-nodes-base.microsoftSharePointTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode);
		authenticateAs('microsoftOAuth2Api');
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: GRAPH });
	});

	it.each([
		['driveItem', DRIVE, `${GRAPH}/v1.0/drives/b!drive-id/root/delta`],
		[
			'listItem',
			LIST,
			`${GRAPH}/v1.0/sites/${encodeURIComponent(SITE_ID)}/lists/list-guid/items/delta`,
		],
	])('addresses the %s feed', async (_feed, target, expected) => {
		request.mockResolvedValueOnce(done());

		await microsoftApiRequestDelta.call(ctx, { ...target } as DeltaRequest);

		expect(optionsOf(0).uri).toBe(expected);
	});

	it.each<[string, IDataObject[], Partial<DeltaRequest>, Partial<DeltaPage>, number]>([
		[
			'drains on the first page',
			[done([{ id: '1' }])],
			{},
			{ items: [{ id: '1' }], deltaLink: `${GRAPH}/done`, drained: true },
			1,
		],
		[
			'concatenates pages in order',
			[next(2, [{ id: '1' }]), next(3, [{ id: '2' }]), done([{ id: '3' }])],
			{},
			{ items: [{ id: '1' }, { id: '2' }, { id: '3' }], drained: true },
			3,
		],
		[
			'follows an empty page that still carries a link',
			[next(2), done([{ id: '1' }])],
			{},
			{ items: [{ id: '1' }], drained: true },
			2,
		],
		[
			'follows a link answered at a different address',
			[{ value: [], '@odata.nextLink': `${GRAPH}/v1.0/drive/delta(token=x)` }, done()],
			{},
			{ drained: true },
			2,
		],
		[
			'stops on an exhausted budget',
			[next(2, [{ id: '1' }])],
			{ deadlineEpochMs: 1 },
			{ items: [{ id: '1' }], nextLink: `${GRAPH}/p2`, drained: false },
			1,
		],
		[
			'stops at the page cap',
			[next(2), next(3)],
			{ maxPages: 2 },
			{ nextLink: `${GRAPH}/p3`, drained: false },
			2,
		],
	])('%s', async (_name, pages, overrides, expected, calls) => {
		for (const page of pages) request.mockResolvedValueOnce(page);

		const result = await run(overrides);

		expect(result).toMatchObject(expected);
		expect(request).toHaveBeenCalledTimes(calls);
	});

	it.each([
		['an empty delta link', { value: [], '@odata.deltaLink': '' }],
		['an empty next link', { value: [], '@odata.nextLink': '' }],
		['no link at all', { value: [] }],
	])('yields no cursor at all when the page carries %s', async (_name, page) => {
		request.mockResolvedValueOnce(page);

		expect(await run()).toEqual({ items: [], drained: false });
	});

	it('sends the query on the first page only, because Graph bakes it into the token', async () => {
		request.mockResolvedValueOnce(next(2)).mockResolvedValueOnce(done());

		await run({ select: ['id', 'name'], top: 100 });

		expect(optionsOf(0).qs).toEqual({ $select: 'id,name', $top: 100 });
		expect(optionsOf(1).qs).toEqual({});
	});

	it('replays a stored cursor verbatim without its query', async () => {
		request.mockResolvedValueOnce(done());

		await run({ select: ['id'], cursor: { kind: 'link', url: `${GRAPH}/stored(token=abc)` } });

		expect(optionsOf(0).uri).toBe(`${GRAPH}/stored(token=abc)`);
		expect(optionsOf(0).qs).toEqual({});
	});

	it('arms with token=latest rather than crawling the library', async () => {
		request.mockResolvedValueOnce(done());

		const page = await run({ cursor: { kind: 'latest' } });

		expect(optionsOf(0).qs).toMatchObject({ token: 'latest' });
		expect(page).toEqual({ items: [], deltaLink: `${GRAPH}/done`, drained: true });
	});

	it.each([true, false])('re-sends deltaExcludeParent=%s on every page', async (excludeParents) => {
		request.mockResolvedValueOnce(next(2)).mockResolvedValueOnce(done());

		await run({ excludeParents });

		for (const call of [0, 1]) {
			const headers = optionsOf(call).headers as IDataObject;
			expect(headers.deltaExcludeParent).toBe(excludeParents ? 'true' : undefined);
		}
	});

	it.each([
		['resyncChangesApplyDifferences', 'resyncChangesApplyDifferences'],
		['resyncChangesUploadDifferences', 'resyncChangesUploadDifferences'],
		[undefined, 'unknown'],
	])('reports a 410 carrying %s as a resync', async (code, expected) => {
		request.mockRejectedValueOnce(graphError(410, code));

		const page = await run({ cursor: { kind: 'link', url: `${GRAPH}/stale` } });

		expect(page).toEqual({ items: [], drained: false, resync: { code: expected } });
	});

	it.each(['microsoftOAuth2Api', SERVICE_PRINCIPAL_AUTH])(
		'surfaces a resync under %s, whose error shaping differs',
		async (auth) => {
			authenticateAs(auth);
			request.mockRejectedValueOnce(graphError(410));

			expect((await run()).resync).toEqual({ code: 'unknown' });
		},
	);

	it.each([403, 404, 500])('still throws a %s', async (status) => {
		request.mockRejectedValueOnce(graphError(status));

		await expect(run()).rejects.toThrow();
	});

	it('passes tombstones, ancestor folders and repeated ids through untouched', async () => {
		const items = [
			{ id: 'gone', deleted: { state: 'deleted' } },
			{ id: 'folder', name: 'Docs', folder: { childCount: 3 } },
			{ id: 'dup', name: 'a.txt', file: {} },
			{ id: 'dup', name: 'a.txt', file: {} },
		];
		request.mockResolvedValueOnce(done(items));

		expect((await run()).items).toEqual(items);
	});

	it.each([1, 2, 3])('retries a 429 %s time(s) and then succeeds', async (throttled) => {
		for (let n = 0; n < throttled; n++) request.mockRejectedValueOnce(graphError(429));
		request.mockResolvedValueOnce(done([{ id: '1' }]));

		expect((await run()).items).toEqual([{ id: '1' }]);
		expect(request).toHaveBeenCalledTimes(throttled + 1);
		expect(sleep).toHaveBeenCalledTimes(throttled);
	});

	it('gives up once the retry ceiling is reached', async () => {
		for (let n = 0; n < 5; n++) request.mockRejectedValueOnce(graphError(429));

		await expect(run()).rejects.toThrow();
		expect(request).toHaveBeenCalledTimes(4);
	});

	it.each([
		['honours the wait Graph asks for', '5', 5_000],
		['caps an unreasonable wait', '600', 30_000],
	])('%s', async (_name, retryAfter, expected) => {
		request.mockRejectedValueOnce(graphError(429, undefined, retryAfter));
		request.mockResolvedValueOnce(done());

		await run();

		expect(sleep).toHaveBeenCalledWith(expected);
	});

	it('gives up instead of sleeping past the poll budget', async () => {
		request.mockRejectedValueOnce(graphError(429, undefined, '10'));

		await expect(run({ deadlineEpochMs: Date.now() + 2_000 })).rejects.toThrow();
		expect(sleep).not.toHaveBeenCalled();
		expect(request).toHaveBeenCalledTimes(1);
	});

	it('still retries when the wait fits inside the budget', async () => {
		request.mockRejectedValueOnce(graphError(429, undefined, '1'));
		request.mockResolvedValueOnce(done([{ id: '1' }]));

		expect((await run({ deadlineEpochMs: Date.now() + 60_000 })).items).toEqual([{ id: '1' }]);
		expect(sleep).toHaveBeenCalledWith(1_000);
	});

	it('falls back to a fixed delay when Graph names no wait', async () => {
		request.mockRejectedValueOnce(graphError(429));
		request.mockResolvedValueOnce(done());

		await run();

		expect(sleep).toHaveBeenCalledWith(1_000);
	});

	it('caps pages by default', () => {
		expect(DEFAULT_DELTA_MAX_PAGES).toBe(40);
	});
});
