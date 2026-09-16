import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INode,
	type NodeOperationError,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getTags } from '../../methods/listSearch';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// `microsoftApiRequestAllItems` closes over the factory's own `microsoftApiRequest`
// (`createMicrosoftGraphTransport` returns both), so mocking only the request export leaves
// `getTags` on the real network path. Mock the helper the method really calls.
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItems: vi.fn(),
	};
});

// Byte-identical to a live 403, captured 2026-09-08 against `/beta/teams/{id}/tags`. The node
// calls `/v1.0`: same permission check, but the v1.0 wording is not separately confirmed (D7).
const TAG_SCOPE_TEXT =
	"API requires one of 'TeamworkTag.Read, TeamworkTag.ReadWrite, TeamSettings.ReadWrite.All'";

const SHAPES = ['production', 'raw'] as const;
type Shape = (typeof SHAPES)[number];

describe('Microsoft Teams v2, getTags', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	let node: INode;
	const apiRequest = transport.microsoftApiRequest as Mock;
	const apiRequestAllItems = transport.microsoftApiRequestAllItems as Mock;

	// `mockDeep` answers an unstubbed call with a proxy rather than `undefined`, so every case
	// has to say what the team is.
	const selectTeam = (teamId: string) => ctx.getCurrentNodeParameter.mockReturnValue(teamId);

	// The two shapes a Graph error reaches the gate in, see `tagPermissionError`.
	const graphError = (shape: Shape, statusCode: number, message: string) =>
		new NodeApiError(node, { message, statusCode }, shape === 'production' ? { message } : {});

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		node = mock<INode>({ typeVersion: 2 });
		ctx.getNode.mockReturnValue(node);
	});

	it('pages through the tags of the selected team', async () => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([]);

		await getTags.call(ctx);

		// Without `extractValue` the read hands back the resource locator object and the path
		// throws for every user.
		expect(ctx.getCurrentNodeParameter).toHaveBeenCalledWith('teamId', { extractValue: true });
		expect(apiRequestAllItems).toHaveBeenCalledWith('value', 'GET', '/v1.0/teams/team-1/tags');
		// A single `microsoftApiRequest` would stop at the first page.
		expect(apiRequest).not.toHaveBeenCalled();
	});

	// Graph returns `memberCount` as a number in the list response and as a string in the
	// get-by-id response, so the label coerces it.
	it.each([
		['several members', 4, 'Engineering (4 members)'],
		['a single member', 1, 'Engineering (1 member)'],
		['a member count Graph sent as a string', '2', 'Engineering (2 members)'],
		['no member count at all', undefined, 'Engineering'],
	])('labels a tag with %s', async (_label, memberCount, expected) => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([
			{ id: 'tag-1', displayName: 'Engineering', description: 'Product engineers', memberCount },
		]);

		const { results } = await getTags.call(ctx);

		expect(results).toEqual([{ name: expected, value: 'tag-1', description: 'Product engineers' }]);
	});

	// Without the fallback `name` is `undefined` and the sort comparator throws a bare TypeError
	// instead of listing the tags. Same guard as `getUsers`.
	it('falls back to the tag ID when Graph sends no display name', async () => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([
			{ id: 'tag-1', memberCount: 4 },
			{ id: 'tag-2', memberCount: 2 },
		]);

		const { results } = await getTags.call(ctx);

		expect(results.map((tag) => tag.name)).toEqual(['tag-1 (4 members)', 'tag-2 (2 members)']);
	});

	it('asks for a team before it requests anything', async () => {
		selectTeam('');

		await expect(getTags.call(ctx)).rejects.toThrow('Select a team first');
		expect(apiRequestAllItems).not.toHaveBeenCalled();
	});

	// Both directions of the filter contract over one fixture. `gineer` rather than `engineering`
	// because the match is a substring, not a prefix. The `member` and `4` rows are the
	// regression guard: the count is appended after the filter runs, and decorating first made
	// every tag match any substring of "(N members)", which reads as a broken search box. The
	// IDs carry no digits, so a count filter cannot match one through `item.value` instead.
	it.each([
		['gineer', ['Engineering (4 members)']],
		['member', []],
		['4', []],
	])('filters the tags client-side on %s', async (filter, expected) => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([
			{ id: 'tag-eng', displayName: 'Engineering', memberCount: 4 },
			{ id: 'tag-sup', displayName: 'Support', memberCount: 9 },
		]);

		const { results } = await getTags.call(ctx, filter);

		expect(results.map((tag) => tag.name)).toEqual(expected);
	});

	// The other branch of the same filter, so the guard above cannot quietly rest on a dead one.
	it('also filters the tags on their ID', async () => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([
			{ id: 'tag-eng', displayName: 'Engineering', memberCount: 4 },
			{ id: 'tag-sup', displayName: 'Support', memberCount: 9 },
		]);

		const { results } = await getTags.call(ctx, 'tag-eng');

		expect(results.map((tag) => tag.name)).toEqual(['Engineering (4 members)']);
	});

	it('sorts the tags by display name', async () => {
		selectTeam('team-1');
		apiRequestAllItems.mockResolvedValue([
			{ id: 'tag-z', displayName: 'Zebra', memberCount: 1 },
			{ id: 'tag-a', displayName: 'Alpha', memberCount: 3 },
		]);

		const { results } = await getTags.call(ctx);

		expect(results.map((tag) => tag.name)).toEqual(['Alpha (3 members)', 'Zebra (1 member)']);
	});

	it.each(SHAPES)('names the missing permission on a %s-shaped 403', async (shape) => {
		selectTeam('team-1');
		apiRequestAllItems.mockRejectedValue(graphError(shape, 403, TAG_SCOPE_TEXT));

		const error = (await getTags.call(ctx).catch((e) => e)) as NodeOperationError;

		// The scope and the action both have to be in the MESSAGE. The resource-locator dropdown
		// renders only the message and drops the description, so a description-only hint is
		// invisible to the user who has to act on it (verified in the editor 2026-09-10).
		expect(error.message).toBe(
			'Could not load team tags. Add TeamworkTag.Read to the credential, then reconnect it.',
		);
	});

	it.each(SHAPES)('passes a %s-shaped 403 about something else through', async (shape) => {
		selectTeam('team-1');
		const original = graphError(shape, 403, 'Insufficient privileges to complete the operation.');
		apiRequestAllItems.mockRejectedValue(original);

		await expect(getTags.call(ctx)).rejects.toBe(original);
	});

	// The scope text, so the status is the only thing keeping this out of the permission rewrite.
	it.each(SHAPES)('passes a %s-shaped rate-limit error through', async (shape) => {
		selectTeam('team-1');
		const original = graphError(shape, 429, TAG_SCOPE_TEXT);
		apiRequestAllItems.mockRejectedValue(original);

		await expect(getTags.call(ctx)).rejects.toBe(original);
	});
});
