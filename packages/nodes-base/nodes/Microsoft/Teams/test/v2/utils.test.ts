import {
	NodeApiError,
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

	it('appends a mention token and the matching mentions entry', () => {
		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [
			mention('guid-1', 'Jane Smith'),
		]);

		expect(body).toEqual({
			body: { contentType: 'html', content: '<at id="0">Jane Smith</at> hi' },
			mentions: [{ id: 0, ...mention('guid-1', 'Jane Smith') }],
		});
		// Graph rejects a string id
		expect(typeof (body.mentions as Array<{ id: unknown }>)[0].id).toBe('number');
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
		expect(content).toBe(
			'<at id="0">Jane Smith</at> <at id="1">Bob Jones</at> <at id="2">Ada Byron</at> hi',
		);
		for (const entry of emitted) {
			expect(content).toContain(`<at id="${entry.id}">${entry.mentionText}</at>`);
		}
		expect(emitted.map((entry) => entry.mentioned.user.id)).toEqual(['guid-1', 'guid-2', 'guid-3']);
	});

	it('switches a text message to HTML when it carries a mention', () => {
		const body = prepareMessage.call(ctx, 'hi', 'text', false, undefined, [
			mention('guid-1', 'Jane Smith'),
		]);

		expect((body.body as { contentType: string }).contentType).toBe('html');
	});

	it('puts the mention tokens before the workflow link footer', () => {
		const body = prepareMessage.call(ctx, 'hi', 'text', true, 'instance-1', [
			mention('guid-1', 'Jane Smith'),
		]);

		const content = (body.body as { content: string }).content;
		expect(content.indexOf('<at id="0"')).toBeLessThan(content.indexOf('Powered by'));
	});

	it('escapes the display name inside the token but leaves the mention data raw', () => {
		const body = prepareMessage.call(ctx, 'hi', 'html', false, undefined, [
			mention('guid-1', 'A & B <Ops>'),
		]);

		expect((body.body as { content: string }).content).toBe(
			'<at id="0">A &amp; B &lt;Ops&gt;</at> hi',
		);
		const emitted = body.mentions as Mention[];
		expect(emitted[0].mentionText).toBe('A & B <Ops>');
		expect(emitted[0].mentioned.user.displayName).toBe('A & B <Ops>');
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

	/** One row per entry, addressed the way the node reads them out of the fixedCollection. */
	const setRows = (...userIds: string[]) =>
		setParams({
			'mentions.mention': userIds.map(() => ({})),
			...Object.fromEntries(userIds.map((id, i) => [`mentions.mention[${i}].userId`, id])),
		});

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

		// Only the `<at>` inner text is escaped, downstream in `prepareMessage`. Escaping here
		// too renders `A &amp;amp; B`.
		expect(resolved.mentionText).toBe('A & B <Ops>');
		expect(resolved.mentioned.user.displayName).toBe('A & B <Ops>');
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

		expect(mentions[0].mentioned.user.id).toBe('guid-guest');
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
});
