import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type IWorkflowMetadata,
	type NodeOperationError,
	type NodeParameterValueType,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { Mention } from '../../v2/helpers/utils';
import { filterSortSearchListItems, prepareMessage, resolveMentions } from '../../v2/helpers/utils';
import * as transport from '../../v2/transport';
import type * as _importType0 from '../../v2/transport';

// Real transport module except the network helper
vi.mock('../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const RESOLVE_QS = { $select: 'id,displayName,userPrincipalName' };

const mention = (id: string, label: string): Mention => ({
	mentionText: label,
	mentioned: { user: { id, displayName: label, userIdentityType: 'aadUser' } },
});

const tagMention = (id: string, label: string): Mention => ({
	mentionText: label,
	mentioned: { tag: { id, displayName: label } },
});

/** The two arms are told apart by key presence, so a test that built a user mention narrows. */
const userOf = (entry: Mention) => {
	if (!('user' in entry.mentioned)) throw new Error('expected a user mention');
	return entry.mentioned.user;
};

const tagOf = (entry: Mention) => {
	if (!('tag' in entry.mentioned)) throw new Error('expected a team tag mention');
	return entry.mentioned.tag;
};

// Byte-identical to a live 403, captured 2026-09-08 against `/beta/teams/{id}/tags`. The node
// calls `/v1.0`: same permission check, but the v1.0 wording is not separately confirmed (D7).
const TAG_SCOPE_TEXT =
	"API requires one of 'TeamworkTag.Read, TeamworkTag.ReadWrite, TeamSettings.ReadWrite.All'";

const SHAPES = ['production', 'raw'] as const;
type Shape = (typeof SHAPES)[number];

describe('Test MicrosoftTeamsV2, filterSortSearchListItems', () => {
	it('should filter, sort and search list items', () => {
		const items = [
			{
				name: 'Test1',
				value: 'test1',
			},
			{
				name: 'Test2',
				value: 'test2',
			},
		];

		const result = filterSortSearchListItems(items, 'test1');

		expect(result).toEqual([
			{
				name: 'Test1',
				value: 'test1',
			},
		]);
	});
});

describe('Test MicrosoftTeamsV2, prepareMessage', () => {
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		ctx = mock<IExecuteFunctions>();
		ctx.getWorkflow.mockReturnValue(mock<IWorkflowMetadata>({ id: 'wf-1' }));
		ctx.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com/');
	});

	it('sends the message untouched when there are no mentions and no workflow link', () => {
		const body = prepareMessage.call(ctx, 'hi', 'text', false);

		expect(body).toEqual({ body: { contentType: 'text', content: 'hi' } });
	});

	it('appends the workflow link footer', () => {
		const body = prepareMessage.call(ctx, 'hi', 'text', true, 'instance-1');

		expect(body).toEqual({
			body: {
				contentType: 'html',
				content:
					'hi<br><br><em> Powered by <a href="https://n8n.example.com/workflow/wf-1?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams_instance-1">this n8n workflow</a> </em>',
			},
		});
	});

	it.each([
		['start', '<at id="0">Jane Smith</at> hi'],
		['end', 'hi <at id="0">Jane Smith</at>'],
	])('places the tokens at the %s of the message', (placement, expected) => {
		const body = prepareMessage.call(
			ctx,
			'hi',
			'html',
			false,
			undefined,
			[mention('guid-1', 'Jane Smith')],
			placement as 'start' | 'end',
		);

		expect((body.body as { content: string }).content).toBe(expected);
	});

	it.each(['start', 'end'])(
		'keeps the workflow-link footer last with %s placement',
		(placement) => {
			const body = prepareMessage.call(
				ctx,
				'hi',
				'text',
				true,
				'instance-1',
				[mention('guid-1', 'Jane Smith')],
				placement as 'start' | 'end',
			);

			const { content } = body.body as { content: string };
			expect(content.indexOf('<at id="0"')).toBeLessThan(content.indexOf('Powered by'));
			expect(content.endsWith('</em>')).toBe(true);
		},
	);

	it('emits a token and a mentions entry sharing the same integer id', () => {
		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [
			mention('guid-1', 'Jane Smith'),
		]);

		// `toEqual` distinguishes 0 from '0', and Graph rejects a string id.
		expect(body).toEqual({
			body: { contentType: 'html', content: '<at id="0">Jane Smith</at> hi' },
			mentions: [{ id: 0, ...mention('guid-1', 'Jane Smith') }],
		});
	});

	it('pairs every token with the mentions entry carrying the same id', () => {
		const mentions = [
			mention('guid-1', 'Jane Smith'),
			mention('guid-2', 'Bob Jones'),
			mention('guid-3', 'Ada Byron'),
		];

		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, mentions);

		const content = (body.body as { content: string }).content;
		const emitted = body.mentions as Array<Mention & { id: number }>;
		// The exact-content assertion is what makes the loop below meaningful: on its own the
		// loop compares the code's output against itself, so an id swap in both places would
		// pass. Do not delete one without the other.
		expect(content).toBe(
			'<at id="0">Jane Smith</at> <at id="1">Bob Jones</at> <at id="2">Ada Byron</at> hi',
		);
		for (const entry of emitted) {
			expect(content).toContain(`<at id="${entry.id}">${entry.mentionText}</at>`);
		}
		expect(emitted.map((entry) => userOf(entry).id)).toEqual(['guid-1', 'guid-2', 'guid-3']);
	});

	it('switches a text message to HTML when it carries a mention', () => {
		const body = prepareMessage.call(ctx, 'hi', 'text', false, undefined, [
			mention('guid-1', 'Jane Smith'),
		]);

		expect((body.body as { contentType: string }).contentType).toBe('html');
	});

	it('escapes the marker text identically in the token and in mentionText', () => {
		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [
			mention('guid-1', 'A & B <Ops>'),
		]);

		const content = (body.body as { content: string }).content;
		expect(content).toBe('<at id="0">A &amp; B &lt;Ops&gt;</at> hi');
		const emitted = body.mentions as Mention[];
		// Graph finds the marker leniently but measures it with `mentionText.length`, so a raw
		// name here against an escaped token makes it duplicate `</at>`'s tail into the message.
		// The two must be the same string.
		expect(emitted[0].mentionText).toBe('A &amp; B &lt;Ops&gt;');
		expect(content).toContain(`<at id="0">${emitted[0].mentionText}</at>`);
		// Metadata, not markup: Graph does not measure this one. Read through `userOf`, because
		// `Mention.mentioned` is a two-arm union once team tags exist.
		expect(userOf(emitted[0]).displayName).toBe('A & B <Ops>');
	});

	it('emits a team tag mention unchanged', () => {
		const tag = tagMention('tag-1', 'Engineering');

		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [tag]);

		expect(body).toEqual({
			body: { contentType: 'html', content: '<at id="0">Engineering</at> hi' },
			mentions: [{ id: 0, ...tag }],
		});
	});

	// The escaping fix lives in `prepareMessage`, which treats both arms alike, so the tag arm
	// inherits it. A tag name is set by a team owner, so it is the same untrusted input class as
	// a guest display name.
	it('escapes the marker text of a team tag mention too', () => {
		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [
			tagMention('tag-1', 'R&D <core>'),
		]);

		const content = (body.body as { content: string }).content;
		const emitted = body.mentions as Mention[];
		expect(content).toBe('<at id="0">R&amp;D &lt;core&gt;</at> hi');
		expect(emitted[0].mentionText).toBe('R&amp;D &lt;core&gt;');
		expect(tagOf(emitted[0]).displayName).toBe('R&D <core>');
	});
});

describe('Test MicrosoftTeamsV2, resolveMentions', () => {
	let ctx: MockProxy<IExecuteFunctions>;
	let node: INode;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType =>
				(name in params ? params[name] : fallback) as NodeParameterValueType,
		);
	};

	/** One user row per entry, the way the fixedCollection stores them. */
	const setRows = (...userIds: string[]) =>
		setParams({ 'mentions.mention': userIds.map((userId) => ({ userId })) });

	/** Rows verbatim, for tag rows and for resource-locator values. */
	const setMentionRows = (...rows: IDataObject[]) => setParams({ 'mentions.mention': rows });

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mock<IExecuteFunctions>();
		node = mock<INode>({ typeVersion: 2 });
		ctx.getNode.mockReturnValue(node);
	});

	it('resolves a UPN to the id and display name Graph returned', async () => {
		setRows('jane@example.com');
		apiRequest.mockResolvedValue({
			id: 'guid-1',
			displayName: 'Jane Smith',
			userPrincipalName: 'jane@example.com',
		});

		const mentions = await resolveMentions.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users/jane%40example.com',
			{},
			RESOLVE_QS,
		);
		expect(mentions).toEqual([mention('guid-1', 'Jane Smith')]);
	});

	// The `#` is what matters in the guest UPN: swapping back to
	// buildTeamsPath/validateMicrosoftGraphId rejects it, so every B2B guest becomes
	// unmentionable. A user id has nothing to encode and must come through untouched.
	it.each([
		[
			'a guest UPN containing #EXT#',
			'jane_example.com#EXT#@tenant.onmicrosoft.com',
			'jane_example.com%23EXT%23%40tenant.onmicrosoft.com',
		],
		[
			'a bare user id',
			'714c1202-cbac-40ff-9160-53ab5c4df9b8',
			'714c1202-cbac-40ff-9160-53ab5c4df9b8',
		],
	])('accepts %s', async (_label, userId, path) => {
		setRows(userId);
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'Jane Smith' });

		await resolveMentions.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', `/v1.0/users/${path}`, {}, RESOLVE_QS);
	});

	it.each([
		['the UPN', { id: 'guid-1', displayName: '', userPrincipalName: 'jane@x.com' }, 'jane@x.com'],
		['the user id', { id: 'guid-1', displayName: '', userPrincipalName: '' }, 'guid-1'],
	])('falls back to %s when the display name is empty', async (_label, user, expected) => {
		setRows('jane@example.com');
		apiRequest.mockResolvedValue(user);

		const mentions = await resolveMentions.call(ctx, 0);

		expect(mentions).toEqual([mention('guid-1', expected)]);
	});

	it('leaves the resolved display name raw', async () => {
		setRows('jane@example.com');
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'A & B <Ops>' });

		const [resolved] = await resolveMentions.call(ctx, 0);

		// `Mention.mentionText` stays the raw name; `prepareMessage` escapes it for both the
		// token and the payload. Escaping here too renders `A &amp;amp; B`.
		expect(resolved.mentionText).toBe('A & B <Ops>');
		expect(userOf(resolved).displayName).toBe('A & B <Ops>');
	});

	it('trims a pasted user id before validating and encoding it', async () => {
		setRows(' jane@example.com ');
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'Jane Smith' });

		await resolveMentions.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users/jane%40example.com',
			{},
			RESOLVE_QS,
		);
	});

	it.each([
		['a pre-encoded email address', 'jane%40example.com'],
		['a value with a path separator', 'a/b'],
	])('rejects %s without calling Graph', async (_label, userId) => {
		setRows(userId);

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow(
			'The user for mention 1 is not valid',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('names the empty row, not the item, when a mention resolves to nothing', async () => {
		setRows('jane@example.com', '');
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'Jane Smith' });

		const error = (await resolveMentions.call(ctx, 3).catch((e) => e)) as NodeOperationError;

		expect(error.message).toBe('No user selected for mention 2');
		expect(error.context.itemIndex).toBe(3);
	});

	const notFound = () =>
		new NodeApiError(node, {
			code: 'Request_ResourceNotFound',
			message: 'Resource not found',
			statusCode: 404,
		});

	it('names the row and the item when Graph cannot find the user', async () => {
		setRows('jane@example.com', 'ghost@example.com');
		apiRequest.mockResolvedValueOnce({ id: 'guid-1', displayName: 'Jane Smith' });
		apiRequest.mockRejectedValueOnce(notFound());
		apiRequest.mockResolvedValueOnce({ value: [] }); // the mail fallback finds nothing either

		const error = (await resolveMentions.call(ctx, 3).catch((e) => e)) as NodeOperationError;

		expect(error.message).toBe('Could not find the user for mention 2');
		expect(error.context.itemIndex).toBe(3);
	});

	// Graph resolves /users/{id} by object id or principal name only. Guests always have a
	// different `mail`, so By Email has to fall back or it 404s on the address people actually know.
	it('falls back to a mail lookup when the address is not a principal name', async () => {
		setRows('alex@contoso.com');
		apiRequest.mockRejectedValueOnce(notFound());
		apiRequest.mockResolvedValueOnce({
			value: [
				{
					id: 'guid-guest',
					displayName: 'Alex Guest',
					userPrincipalName: 'alex_contoso.com#EXT#@tenant.onmicrosoft.com',
				},
			],
		});

		const mentions = await resolveMentions.call(ctx, 0);

		expect(userOf(mentions[0]).id).toBe('guid-guest');
		expect(mentions[0].mentionText).toBe('Alex Guest');
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/v1.0/users',
			{},
			{
				$filter: "mail eq 'alex@contoso.com'",
				$select: 'id,displayName,userPrincipalName',
				$top: 2,
			},
		);
	});

	it('doubles a single quote in the mail filter so the OData literal stays closed', async () => {
		setRows("o'brien@contoso.com");
		apiRequest.mockRejectedValueOnce(notFound());
		apiRequest.mockResolvedValueOnce({ value: [{ id: 'g', displayName: 'O Brien' }] });

		await resolveMentions.call(ctx, 0);

		expect(apiRequest.mock.calls[1][3].$filter).toBe("mail eq 'o''brien@contoso.com'");
	});

	it('treats an ambiguous mail match as not found rather than guessing', async () => {
		setRows('shared@contoso.com');
		apiRequest.mockRejectedValueOnce(notFound());
		apiRequest.mockResolvedValueOnce({ value: [{ id: 'a' }, { id: 'b' }] });

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow(
			'Could not find the user for mention 1',
		);
	});

	it('does not attempt a mail lookup for a GUID', async () => {
		setRows('11111111-1111-1111-1111-111111111111');
		apiRequest.mockRejectedValueOnce(notFound());

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow(
			'Could not find the user for mention 1',
		);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('stamps the item index when the mail fallback itself fails', async () => {
		setRows('jane@example.com', 'alex@contoso.com');
		apiRequest.mockResolvedValueOnce({ id: 'guid-1', displayName: 'Jane Smith' });
		apiRequest.mockRejectedValueOnce(notFound());
		// The fallback runs inside the 404 handler, so its own failure has no other stamping path.
		const throttled = new NodeApiError(node, {
			code: 'TooManyRequests',
			message: 'Rate limit is exceeded.',
			statusCode: 429,
		});
		apiRequest.mockRejectedValueOnce(throttled);

		await expect(resolveMentions.call(ctx, 3)).rejects.toBe(throttled);
		expect(throttled.context.itemIndex).toBe(3);
	});

	it('passes a permission failure through with the item index', async () => {
		setRows('jane@example.com');
		const forbidden = new NodeApiError(node, {
			code: 'Authorization_RequestDenied',
			message: 'Insufficient privileges to complete the operation.',
			statusCode: 403,
		});
		apiRequest.mockRejectedValueOnce(forbidden);

		// Graph's own message, stamped rather than replaced.
		await expect(resolveMentions.call(ctx, 3)).rejects.toBe(forbidden);
		expect(forbidden.context.itemIndex).toBe(3);
	});

	it('keeps each resolved user paired with its own row', async () => {
		setRows('jane@example.com', 'bob@example.com');
		apiRequest
			.mockResolvedValueOnce({ id: 'guid-1', displayName: 'Jane Smith' })
			.mockResolvedValueOnce({ id: 'guid-2', displayName: 'Bob Jones' });

		const mentions = await resolveMentions.call(ctx, 0);

		expect(mentions).toEqual([mention('guid-1', 'Jane Smith'), mention('guid-2', 'Bob Jones')]);
	});

	it('unwraps a resource locator value', async () => {
		setMentionRows({
			userId: { __rl: true, mode: 'id', value: '714c1202-cbac-40ff-9160-53ab5c4df9b8' },
		});
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'Jane Smith' });

		await resolveMentions.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users/714c1202-cbac-40ff-9160-53ab5c4df9b8',
			{},
			RESOLVE_QS,
		);
	});

	it('names the empty row when a picker was added but never filled in', async () => {
		// The resource locator default. Unwrapping it on truthiness instead of on key presence
		// tells the user to remove slashes from an ID they never typed.
		setMentionRows({ userId: { __rl: true, mode: 'list', value: '' } });

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow('No user selected for mention 1');
	});

	it('treats a row with no mention type as a user mention', async () => {
		// The shape a workflow saved before the discriminator existed still has on disk.
		setMentionRows({ userId: 'jane@example.com' });
		apiRequest.mockResolvedValue({ id: 'guid-1', displayName: 'Jane Smith' });

		const mentions = await resolveMentions.call(ctx, 0, 'team-1');

		expect(mentions).toEqual([mention('guid-1', 'Jane Smith')]);
	});

	// `isResourceLocatorValue` needs `__rl`, so a hand-authored locator missing it is not
	// unwrapped. Stringifying it would send the literal `[object Object]` to Graph, which
	// `validateMicrosoftGraphId` does not reject, and burn a request to learn nothing.
	it('names the empty row for a resource locator missing its __rl marker', async () => {
		setMentionRows({ userId: { mode: 'id', value: '714c1202-cbac-40ff-9160-53ab5c4df9b8' } });

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow('No user selected for mention 1');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	// The collapse above is for objects only. A number is a bad ID but not a guaranteed-useless
	// one, so it keeps reaching the validator and its "not valid" wording.
	it('still stringifies a non-string primitive', async () => {
		setMentionRows({ userId: 12345 });

		await expect(resolveMentions.call(ctx, 0)).rejects.toThrow(
			'The user for mention 1 is not valid',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a mention type it does not know', async () => {
		// Reachable from imported JSON, the public API, the workflow builder, or a `$fromAI()`
		// discriminator. Falling through to the user branch would report "No user selected" on a
		// row the UI labels Team Tag.
		setMentionRows({ mentionType: 'Tag', tagId: 'tag-1' });

		await expect(resolveMentions.call(ctx, 0, 'team-1')).rejects.toThrow(
			'The mention type for mention 1 is not valid',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	describe('team tag rows', () => {
		const tagRow = (tagId: string) => setMentionRows({ mentionType: 'tag', tagId });

		// The two shapes a Graph error reaches the gate in, see `tagPermissionError`.
		const graphError = (shape: Shape, statusCode: number, message: string) =>
			new NodeApiError(node, { message, statusCode }, shape === 'production' ? { message } : {});

		it('resolves a tag through the team it belongs to', async () => {
			tagRow('tag-1');
			apiRequest.mockResolvedValue({ id: 'tag-1', displayName: 'Engineering' });

			const mentions = await resolveMentions.call(ctx, 0, 'team-1');

			expect(apiRequest).toHaveBeenCalledWith('GET', '/v1.0/teams/team-1/tags/tag-1');
			expect(mentions).toEqual([tagMention('tag-1', 'Engineering')]);
		});

		// `validateMicrosoftGraphId` decodes before validating, so a percent-encoded ID is
		// accepted here even though the By ID field rejects it in the editor. The user branch
		// diverges the other way and rejects `jane%40example.com` outright.
		it.each([
			['leaves base64 padding unencoded', 'YWJjZA==', '/v1.0/teams/team-1/tags/YWJjZA=='],
			['decodes a percent-encoded ID', 'abc%3D', '/v1.0/teams/team-1/tags/abc='],
		])('%s in the path', async (_label, tagId, expected) => {
			tagRow(tagId);
			apiRequest.mockResolvedValue({ id: tagId, displayName: 'Engineering' });

			await resolveMentions.call(ctx, 0, 'team-1');

			expect(apiRequest).toHaveBeenCalledWith('GET', expected);
		});

		it('takes the tag ID from the Graph response, not from the input', async () => {
			// Real Graph echoes the requested id back, so only an artificial mismatch can pin
			// which side the body binds from. The body is what decides who gets notified.
			tagRow('REQUESTED=');
			apiRequest.mockResolvedValue({ id: 'RESPONSE=', displayName: 'Engineering' });

			const mentions = await resolveMentions.call(ctx, 0, 'team-1');

			expect(apiRequest).toHaveBeenCalledWith('GET', '/v1.0/teams/team-1/tags/REQUESTED=');
			expect(mentions).toEqual([tagMention('RESPONSE=', 'Engineering')]);
		});

		// The v1.0 get-by-id docs example wraps the entity in `value`, the list endpoint returns
		// an array under the same key. The live spike settles which one Graph really sends.
		it.each([
			['a wrapped body', { value: { id: 'tag-1', displayName: 'Engineering' } }],
			['a flat body', { id: 'tag-1', displayName: 'Engineering' }],
		])('reads the tag out of %s', async (_label, response) => {
			tagRow('tag-1');
			apiRequest.mockResolvedValue(response);

			const mentions = await resolveMentions.call(ctx, 0, 'team-1');

			expect(mentions).toEqual([tagMention('tag-1', 'Engineering')]);
		});

		// No fallback for either field: a tag id makes a garbage chip that Graph still accepts,
		// and a missing id drops `mentioned.tag` from the body for a green run and a mention
		// that notifies nobody.
		it.each([
			['the list shape', { value: [{ id: 'tag-1', displayName: 'Engineering' }] }],
			['no display name', { id: 'tag-1' }],
			['no ID', { displayName: 'Engineering' }],
		])('refuses to build a mention from %s', async (_label, response) => {
			tagRow('tag-1');
			apiRequest.mockResolvedValue(response);

			await expect(resolveMentions.call(ctx, 0, 'team-1')).rejects.toThrow(
				'Could not read the team tag for mention 1',
			);
		});

		it('keeps a tag row and a user row in their own slots', async () => {
			setMentionRows(
				{ mentionType: 'tag', tagId: 'tag-1' },
				{ mentionType: 'user', userId: 'jane@example.com' },
			);
			apiRequest
				.mockResolvedValueOnce({ id: 'tag-1', displayName: 'Engineering' })
				.mockResolvedValueOnce({ id: 'guid-1', displayName: 'Jane Smith' });

			const mentions = await resolveMentions.call(ctx, 0, 'team-1');

			expect(mentions).toEqual([
				tagMention('tag-1', 'Engineering'),
				mention('guid-1', 'Jane Smith'),
			]);
		});

		it('leaves the resolved tag name raw', async () => {
			tagRow('tag-1');
			apiRequest.mockResolvedValue({ id: 'tag-1', displayName: 'R&D <core>' });

			const [resolved] = await resolveMentions.call(ctx, 0, 'team-1');

			// Only the `<at>` inner text is escaped, downstream in `prepareMessage`.
			expect(resolved).toEqual(tagMention('tag-1', 'R&D <core>'));
		});

		it('names the row when no tag was picked', async () => {
			setMentionRows({ mentionType: 'tag', tagId: { __rl: true, mode: 'list', value: '' } });

			const error = (await resolveMentions
				.call(ctx, 3, 'team-1')
				.catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('No team tag selected for mention 1');
			expect(error.context.itemIndex).toBe(3);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('names the row when the team is empty', async () => {
			tagRow('tag-1');

			const error = (await resolveMentions.call(ctx, 3, '').catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('No team selected for the team tag in mention 1');
			expect(error.context.itemIndex).toBe(3);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects a tag row on a chat message', async () => {
			// A chat message passes no team. Only a hand-edited row or the public API gets here,
			// because the chat form offers no tag picker.
			tagRow('tag-1');

			const error = (await resolveMentions.call(ctx, 3).catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('Team tags are not available in a chat message');
			expect(error.description).toBe('Remove mention 1 or use a channel message.');
			expect(error.context.itemIndex).toBe(3);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('stamps the item index on a malformed tag ID', async () => {
			// The path is built inside the same try as the request, so the failure is still
			// attributed to its item under continueOnFail. It keeps the validator's own message:
			// the same call validates the team segment, so relabelling it as a tag problem would
			// mislabel a malformed team ID.
			tagRow('a/b');

			const error = (await resolveMentions
				.call(ctx, 3, 'team-1')
				.catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('The ID is not valid');
			expect(error.context.itemIndex).toBe(3);
		});

		it.each(SHAPES)('names the missing permission on a %s-shaped 403', async (shape) => {
			tagRow('tag-1');
			apiRequest.mockRejectedValue(graphError(shape, 403, TAG_SCOPE_TEXT));

			const error = (await resolveMentions
				.call(ctx, 3, 'team-1')
				.catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('Could not read the team tag');
			expect(error.description).toContain('TeamworkTag.Read');
			expect(error.context.itemIndex).toBe(3);
		});

		it.each(SHAPES)('passes a %s-shaped 403 about something else through', async (shape) => {
			tagRow('tag-1');
			const original = graphError(shape, 403, 'Insufficient privileges to complete the operation.');
			apiRequest.mockRejectedValue(original);

			await expect(resolveMentions.call(ctx, 0, 'team-1')).rejects.toBe(original);
		});

		// The scope text, so the status is the only thing keeping this out of the rewrite.
		it.each(SHAPES)('passes a %s-shaped server error through', async (shape) => {
			tagRow('tag-1');
			const original = graphError(shape, 500, TAG_SCOPE_TEXT);
			apiRequest.mockRejectedValue(original);

			await expect(resolveMentions.call(ctx, 0, 'team-1')).rejects.toBe(original);
		});

		it('names the row when the tag is not in this team', async () => {
			// A foreign tag ID 404s under `/teams/{other}/tags/{id}`, which is how team
			// ownership is proven.
			tagRow('tag-1');
			apiRequest.mockRejectedValue(notFound());

			const error = (await resolveMentions
				.call(ctx, 3, 'team-1')
				.catch((e) => e)) as NodeOperationError;

			expect(error.message).toBe('Could not find the team tag for mention 1');
			expect(error.context.itemIndex).toBe(3);
		});
	});
});
