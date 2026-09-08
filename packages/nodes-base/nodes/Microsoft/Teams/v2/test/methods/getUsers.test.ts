import type { ILoadOptionsFunctions, INode, INodeProperties } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../MicrosoftTeamsV2.node';
import { getUsers } from '../../methods/listSearch';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper.
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// The general shape of `getUsers` (query, escaping, pagination, labelling) is pinned in
// `listSearch.test.ts`. This file covers only what the mention work added on top.
describe('Microsoft Teams v2, getUsers additions for mentions', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i?: number, fallback?: unknown) =>
				(name === 'authentication' ? 'microsoftOAuth2Api' : fallback) as never,
		);
		apiRequest.mockResolvedValue({ value: [] });
	});

	const searchOf = () => apiRequest.mock.calls[0][3].$search as string | undefined;

	// A guest's `mail` differs from their principal name, and the mail is the address people
	// know, so the picker has to match on it as well.
	it('searches mail alongside display name and principal name', async () => {
		await getUsers.call(ctx, 'jan');

		expect(searchOf()).toBe('"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"');
	});

	// `&` and `#` cannot be escaped or encoded away: Graph re-splits the query string after
	// percent-decoding, so they truncate the expression and 400 the whole call. Verified on a
	// live tenant, where typing `&` into the picker returned "Could not load list".
	it.each([
		['j&an', 'jan'],
		['j#an', 'jan'],
		['a&b#c', 'abc'],
	])('drops %j from the search term, leaving %j', async (filter, term) => {
		await getUsers.call(ctx, filter);

		expect(searchOf()).toBe(
			`"displayName:${term}" OR "mail:${term}" OR "userPrincipalName:${term}"`,
		);
	});

	it('omits $search entirely when only unusable characters were given', async () => {
		await getUsers.call(ctx, '&#');

		expect(searchOf()).toBeUndefined();
	});

	// An unexpected response shape is not an empty directory: returning the next-page token
	// would offer "load more" into nothing.
	it('returns no results and no token when Graph replies without a value array', async () => {
		apiRequest.mockResolvedValue({ '@odata.nextLink': 'https://graph.microsoft.com/next' });

		await expect(getUsers.call(ctx)).resolves.toEqual({
			results: [],
			paginationToken: undefined,
		});
	});
});

describe('Microsoft Teams v2, mention picker wiring', () => {
	const mentionsField = (resource: string, operation: string) =>
		versionDescription.properties.find(
			(property) =>
				property.name === 'mentions' &&
				property.displayOptions?.show?.resource?.includes(resource) &&
				property.displayOptions?.show?.operation?.includes(operation),
		);

	const mentionRow = (resource: string, operation = 'create') =>
		((mentionsField(resource, operation)?.options ?? [])[0] as { values: INodeProperties[] })
			?.values ?? [];

	const mentionUserRlc = (resource: string, operation = 'create') =>
		mentionRow(resource, operation).find((value) => value.name === 'userId');

	const mentionTagRlc = (resource: string, operation = 'create') =>
		mentionRow(resource, operation).find((value) => value.name === 'tagId');

	const tagByIdRegex = () => {
		const byId = mentionTagRlc('channelMessage')?.modes?.find((mode) => mode.name === 'id');
		const { regex } = (byId?.validation?.[0] as unknown as { properties: { regex: string } })
			.properties;
		return new RegExp(regex);
	};

	it.each([
		['channelMessage', 'create'],
		['channelMessage', 'reply'],
		['chatMessage', 'create'],
	])('%s %s offers a user picker backed by getUsers', (resource, operation) => {
		const listMode = mentionUserRlc(resource, operation)?.modes?.find(
			(mode) => mode.name === 'list',
		);

		expect(listMode?.typeOptions?.searchListMethod).toBe('getUsers');
		expect(new MicrosoftTeamsV2(versionDescription).methods.listSearch).toHaveProperty('getUsers');
	});

	it('leaves the By ID mode without an extractValue', () => {
		const byId = mentionUserRlc('channelMessage')?.modes?.find((mode) => mode.name === 'id');

		expect(byId).toBeDefined();
		// An extract regex runs before node code and rejects the email address an AI agent emits
		// when it cannot know which mode is selected.
		expect(byId?.extractValue).toBeUndefined();
	});

	it('accepts a non-v4 Entra user ID in the By ID mode', () => {
		const byId = mentionUserRlc('channelMessage')?.modes?.find((mode) => mode.name === 'id');
		const { regex } = (byId?.validation?.[0] as unknown as { properties: { regex: string } })
			.properties;

		expect(new RegExp(regex).test('714c1202-cbac-10ff-c160-53ab5c4df9b8')).toBe(true);
	});

	it.each([
		['channelMessage', 'create'],
		['channelMessage', 'reply'],
	])('%s %s offers a team tag picker backed by getTags', (resource, operation) => {
		const listMode = mentionTagRlc(resource, operation)?.modes?.find(
			(mode) => mode.name === 'list',
		);

		// The only guard on the method name: `generate-metadata` collects `loadOptionsMethod`
		// references only, and this node registers no `loadOptions` at all.
		expect(listMode?.typeOptions?.searchListMethod).toBe('getTags');
		expect(new MicrosoftTeamsV2(versionDescription).methods.listSearch).toHaveProperty('getTags');
	});

	it.each([
		['channelMessage', 'create', ['mentionType', 'userId', 'tagId']],
		['channelMessage', 'reply', ['mentionType', 'userId', 'tagId']],
		// A chat is not team-scoped, so there is no team to scope tags to.
		['chatMessage', 'create', ['userId']],
	])('%s %s builds a mention row from %j', (resource, operation, names) => {
		expect(mentionRow(resource, operation).map((value) => value.name)).toEqual(names);
	});

	it('leaves the chat user picker ungated', () => {
		// A mutate-instead-of-spread on `userRLC` would hide it behind a mention type that a
		// chat row does not have.
		expect(mentionUserRlc('chatMessage')?.displayOptions).toBeUndefined();
	});

	it('offers no expression for the mention type', () => {
		// An expression-valued discriminator makes both dependent pickers count as displayed, so
		// both report a missing required parameter at once. It is an editor-side guard only: a
		// lone `$fromAI()` expression survives, which is what the runtime check is for.
		expect(
			mentionRow('channelMessage').find((value) => value.name === 'mentionType')?.noDataExpression,
		).toBe(true);
	});

	it('shows each channel picker only for its own mention type', () => {
		expect(mentionUserRlc('channelMessage')?.displayOptions?.show?.mentionType).toEqual(['user']);
		expect(mentionTagRlc('channelMessage')?.displayOptions?.show?.mentionType).toEqual(['tag']);
	});

	it('reloads the tag list when the team changes', () => {
		expect(mentionTagRlc('channelMessage')?.typeOptions?.loadOptionsDependsOn).toEqual([
			'teamId.value',
		]);
	});

	// Against the literals, not against each other: comparing the two fields passes if both are
	// renamed, and `mentions` plus `mention` are the two strings the resolver reads rows by.
	it.each([
		['channelMessage', 'create'],
		['channelMessage', 'reply'],
		['chatMessage', 'create'],
	])('%s %s stores its rows under mentions.mention', (resource, operation) => {
		const field = mentionsField(resource, operation);

		expect(field?.type).toBe('fixedCollection');
		expect(field?.default).toEqual({});
		expect(field?.placeholder).toBe('Add Mention');
		expect((field?.options ?? [])[0]?.name).toBe('mention');
		// Rows are reorderable because `prepareMessage` numbers the tokens by array order.
		expect(field?.typeOptions?.sortable).toBe(true);
		// Without it the rows stop being an array and every mention is dropped on a green run.
		expect(field?.typeOptions?.multipleValues).toBe(true);
	});

	it.each([
		['a value with a path separator', 'AbC0123/xyz'],
		// The execute half of this divergence lives in utils.test.ts: `validateMicrosoftGraphId`
		// percent-decodes before validating, so the same value is accepted at run time.
		['a percent-encoded value', 'abc%3D'],
	])('rejects %s in the tag By ID mode', (_label, value) => {
		expect(tagByIdRegex().test(value)).toBe(false);
	});

	// The value the workflow fixtures ship as a tag ID. The trailing space keeps the editor
	// agreeing with `rlcValue`, which trims before it looks the tag up.
	it.each([
		['base64 padding', 'RW5naW5lZXJpbmc='],
		['a trailing space', 'RW5naW5lZXJpbmc= '],
	])('accepts a tag ID with %s in the By ID mode', (_label, value) => {
		expect(tagByIdRegex().test(value)).toBe(true);
	});

	// Blocked on the D7 live spike. The rows above use a synthetic id, so only an id captured
	// from a real tenant can pin the charset and the length of a real one.
	it.todo('accepts a real tag ID in the By ID mode');
});
