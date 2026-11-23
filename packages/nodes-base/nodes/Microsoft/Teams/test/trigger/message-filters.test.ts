import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IDataObject,
	INode,
	IWebhookFunctions,
	JsonObject,
	NodeParameterValueType,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import type { WebhookNotification } from '../../v2/helpers/types';
import {
	filterChangeNotifications,
	getMessageFilters,
	getMessagePath,
	messagePassesFilters,
	type MessageFilters,
} from '../../v2/helpers/message-filters';
import type * as _transport from '../../v2/transport';
import { microsoftApiRequest, SERVICE_PRINCIPAL_AUTH } from '../../v2/transport';

vi.mock('../../v2/transport', async () => {
	const actual = await vi.importActual<typeof _transport>('../../v2/transport');
	return { ...actual, microsoftApiRequest: { call: vi.fn() } };
});

const request = microsoftApiRequest.call as Mock;
const readPaths = () => request.mock.calls.map((call) => String(call[2]));

const ctxWith = (params: Record<string, unknown> = {}, staticData: object = {}) => {
	const ctx = mockDeep<IWebhookFunctions>();
	ctx.getWorkflow.mockReturnValue({ id: 'wf1', active: true });
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Microsoft Teams Trigger' }));
	ctx.getWorkflowStaticData.mockReturnValue(staticData as IDataObject);
	ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
		if (name in params) return params[name] as NodeParameterValueType;
		const [root, option] = name.split('.');
		const collection = params[root];
		if (option && typeof collection === 'object' && collection !== null && option in collection) {
			return (collection as Record<string, unknown>)[option] as NodeParameterValueType;
		}
		return fallback as NodeParameterValueType;
	});
	return ctx;
};

const off: MessageFilters = {
	mentionsMe: false,
	keyword: '',
	skipSystemMessages: false,
	skipBotMessages: false,
};

const apiError = (httpCode: string) =>
	new NodeApiError(mock<INode>(), { message: `status ${httpCode}`, httpCode });

// The shape `microsoftApiRequest` throws when core cannot refresh a revoked OAuth2 token: it has
// no HTTP status.
const reconnectError = () =>
	new NodeApiError(
		mock<INode>(),
		new NodeOperationError(mock<INode>(), 'The credential "Teams" needs to be reconnected.', {
			description: 'Open the credential and reconnect it to continue.',
			failure: { cause: 'credential-invalid' },
		}) as unknown as JsonObject,
	);

const channelResource = (id: string) => `teams('t1')/channels('c1')/messages('${id}')`;
const notification = (id: string, resource = channelResource(id)): WebhookNotification => ({
	subscriptionId: 'sub1',
	resource,
	resourceData: { id },
	tenantId: 'x',
	subscriptionExpirationDateTime: '',
});

const plainMessage = { messageType: 'message', from: { user: { id: 'u1' } } };

describe('message filters', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('messagePassesFilters', () => {
		it.each(['systemEventMessage', 'unknownFutureValue'])(
			'skips a %s with Skip System Messages',
			async (messageType) => {
				const filters = { ...off, skipSystemMessages: true };
				expect(await messagePassesFilters({ messageType }, filters, undefined)).toBe(false);
				expect(await messagePassesFilters(plainMessage, filters, undefined)).toBe(true);
			},
		);

		it.each([
			['a missing messageType', {}],
			['a non-string messageType', { messageType: 1 }],
		])('skips %s with Skip System Messages', async (_label, message) => {
			expect(await messagePassesFilters(message, { ...off, skipSystemMessages: true }, 'me')).toBe(
				false,
			);
		});

		it('skips a message from an app with Skip Bot Messages', async () => {
			const filters = { ...off, skipBotMessages: true };
			const fromApp = { from: { application: { id: 'bot' }, user: null } };
			const fromUser = { from: { user: { id: 'u1' }, application: null } };

			expect(await messagePassesFilters(fromApp, filters, undefined)).toBe(false);
			expect(await messagePassesFilters(fromUser, filters, undefined)).toBe(true);
		});

		it('passes only a message that mentions the user with Mentions Me', async () => {
			const filters = { ...off, mentionsMe: true };
			const message = { mentions: [{ mentioned: { user: { id: 'me' } } }] };
			const other = { mentions: [{ mentioned: { user: { id: 'someone' } } }] };

			expect(await messagePassesFilters(message, filters, 'me')).toBe(true);
			expect(await messagePassesFilters(other, filters, 'me')).toBe(false);
			expect(await messagePassesFilters(message, filters, undefined)).toBe(false);
			expect(
				await messagePassesFilters(
					{ mentions: [{ mentioned: { user: { id: '' } } }] },
					filters,
					'',
				),
			).toBe(false);
		});

		it('counts only the user mention next to a channel mention', async () => {
			const filters = { ...off, mentionsMe: true };
			const message = (userId: string) => ({
				mentions: [
					{ mentioned: { conversation: { id: 'c1', conversationIdentityType: 'channel' } } },
					{ mentioned: { user: { id: userId } } },
				],
			});

			expect(await messagePassesFilters(message('someone'), filters, 'me')).toBe(false);
			expect(await messagePassesFilters(message('me'), filters, 'me')).toBe(true);
		});

		it('does not count a tag mention as a mention of the user', async () => {
			const tagOnly = { mentions: [{ mentioned: { tag: { id: 'tag1', displayName: 'Ops' } } }] };

			expect(await messagePassesFilters(tagOnly, { ...off, mentionsMe: true }, 'me')).toBe(false);
		});

		const html = (content: string) => ({ body: { contentType: 'html', content } });
		it.each([
			['an HTML body, ignoring case', html('<p>Deploy <b>NOW</b></p>'), 'now', true],
			['a miss', html('<p>Deploy later</p>'), 'now', false],
			['the subject only', { subject: 'Release now', ...html('<p>x</p>') }, 'now', true],
			['tags in a text body', { body: { contentType: 'text', content: 'a <b> b' } }, '<b>', true],
			['a link target', html('<a href="https://x/deploy">docs</a>'), 'deploy', false],
			['an image', html('<img alt="deploy" src="https://x/deploy.png">'), 'deploy', false],
			['across subject and body (newline)', { subject: 'foo', ...html('bar') }, 'foo\nbar', false],
			['across subject and body (join)', { subject: 'foo', ...html('bar') }, 'ob', false],
			[
				'a no-break space after a mention',
				html('<at id="0">Ann</at>&nbsp;please'),
				'ann please',
				true,
			],
			['a no-break space between words', html('<p>please&nbsp;review</p>'), 'please review', true],
			['repeated spaces in the subject', { subject: 'please   review' }, 'please review', true],
			['an emoji', html('<p>ok <emoji id="1f600_grinning" alt="😀"></emoji></p>'), '😀', true],
			['a custom emoji', html('<customemoji alt="party"></customemoji>'), 'party', true],
			[
				'text after a self-closed emoji',
				html('<p>ok <emoji alt="😀" /> deploy now</p>'),
				'deploy now',
				true,
			],
			['repeated spaces in the keyword', { subject: 'ann please' }, 'ann   please', true],
		])('matches the keyword for %s', async (_label, message, keyword, expected) => {
			expect(await messagePassesFilters(message, { ...off, keyword }, undefined)).toBe(expected);
		});

		it.each([
			['no sender passes Skip Bot', { from: null }, { ...off, skipBotMessages: true }, 'me', true],
			['no body fails the keyword', { body: null }, { ...off, keyword: 'x' }, 'me', false],
			[
				'a mention without a user fails Mentions Me',
				{ mentions: [{ mentioned: { user: null } }] },
				{ ...off, mentionsMe: true },
				'me',
				false,
			],
			[
				'mentions that are not a list fail Mentions Me',
				{ mentions: { mentioned: { user: { id: 'me' } } } },
				{ ...off, mentionsMe: true },
				'me',
				false,
			],
			[
				'a message that is not an object fails',
				'text',
				{ ...off, skipBotMessages: true },
				'me',
				false,
			],
		])('handles odd shapes: %s', async (_label, message, filters, userId, expected) => {
			expect(await messagePassesFilters(message, filters, userId)).toBe(expected);
		});

		it('combines the enabled filters with AND', async () => {
			const filters: MessageFilters = {
				mentionsMe: true,
				keyword: 'deploy',
				skipSystemMessages: true,
				skipBotMessages: true,
			};
			const message = {
				messageType: 'message',
				from: { user: { id: 'u1' }, application: null },
				mentions: [{ mentioned: { user: { id: 'me' } } }],
				body: { contentType: 'text', content: 'please deploy' },
			};

			expect(await messagePassesFilters(message, filters, 'me')).toBe(true);
			expect(
				await messagePassesFilters({ ...message, messageType: 'chatEvent' }, filters, 'me'),
			).toBe(false);
			expect(await messagePassesFilters(message, { ...filters, keyword: 'other' }, 'me')).toBe(
				false,
			);
			expect(await messagePassesFilters(message, filters, 'someone')).toBe(false);
		});
	});

	describe('getMessageFilters', () => {
		const read = (params: Record<string, unknown>) =>
			getMessageFilters.call(ctxWith({ event: 'newChannelMessage', ...params }));

		it.each([
			['no filters', {}],
			['blank keyword and a false toggle', { keyword: '  ', skipBotMessages: false }],
		])('is off for %s', (_label, filters) => {
			expect(read({ filters })).toBeUndefined();
		});

		it('is off for a filters value that is not an object', () => {
			expect(read({ filters: 'x' })).toBeUndefined();
		});

		it('reads no other parameter when no filter is on', () => {
			const ctx = ctxWith({ filters: {} });
			ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
				if (name !== 'filters') throw new Error(`unexpected read of ${name}`);
				return fallback as NodeParameterValueType;
			});

			expect(getMessageFilters.call(ctx)).toBeUndefined();
		});

		it('evaluates no filter expression for an event without messages', () => {
			const ctx = ctxWith({
				event: 'newChannel',
				filters: { keyword: '={{ $("Missing").item }}' },
			});
			const baseline = ctx.getNodeParameter.getMockImplementation();
			ctx.getNodeParameter.mockImplementation(((
				name: string,
				fallback?: unknown,
				options?: { rawExpressions?: boolean },
			) => {
				if (name === 'filters' && !options?.rawExpressions) throw new Error('cannot resolve');
				return baseline?.(name, fallback as never);
			}) as never);

			expect(getMessageFilters.call(ctx)).toBeUndefined();
		});

		it('is off for an event without messages', () => {
			expect(read({ event: 'newChannel', filters: { skipBotMessages: true } })).toBeUndefined();
		});

		it('reads the filters for a chat message event', () => {
			expect(read({ event: 'newChatMessage', filters: { skipBotMessages: true } })).toEqual({
				...off,
				skipBotMessages: true,
			});
		});

		it('trims the keyword', () => {
			expect(read({ filters: { keyword: '  deploy ' } })).toEqual({ ...off, keyword: 'deploy' });
		});

		it('turns Mentions Me off under Service Principal', () => {
			expect(
				read({ authentication: SERVICE_PRINCIPAL_AUTH, filters: { mentionsMe: true } }),
			).toBeUndefined();
			expect(
				read({
					authentication: SERVICE_PRINCIPAL_AUTH,
					filters: { mentionsMe: true, skipBotMessages: true },
				}),
			).toEqual({ ...off, skipBotMessages: true });
		});
	});

	describe('getMessagePath', () => {
		const pathOf = (resource: unknown) => {
			const target = getMessagePath.call(ctxWith(), resource);
			return target && { path: String(target.path), permission: target.permission };
		};

		it.each([
			[
				'a channel message',
				"teams('0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0')/channels('19:abc123@thread.tacv2')/messages('1612289765949')",
				'/v1.0/teams/0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0/channels/19:abc123@thread.tacv2/messages/1612289765949',
				'ChannelMessage.Read.All',
			],
			[
				'a channel message with a leading slash',
				"/teams('t1')/channels('c1')/messages('1')",
				'/v1.0/teams/t1/channels/c1/messages/1',
				'ChannelMessage.Read.All',
			],
			[
				'a reply',
				"teams('t1')/channels('c1')/messages('1')/replies('2')",
				'/v1.0/teams/t1/channels/c1/messages/1/replies/2',
				'ChannelMessage.Read.All',
			],
			[
				'a chat message',
				"chats('19:0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0_1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809@unq.gbl.spaces')/messages('1')",
				'/v1.0/chats/19:0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0_1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809@unq.gbl.spaces/messages/1',
				'Chat.Read',
			],
			[
				'a group chat message',
				"chats('19:meeting_abc@thread.v2')/messages('1')",
				'/v1.0/chats/19:meeting_abc@thread.v2/messages/1',
				'Chat.Read',
			],
		])('builds the path of %s', (_label, resource, path, permission) => {
			expect(pathOf(resource)).toEqual({ path, permission });
		});

		it('builds the same path for an encoded channel id', () => {
			expect(pathOf("teams('t1')/channels('19%3Aabc%40thread.tacv2')/messages('1')")).toEqual(
				pathOf("teams('t1')/channels('19:abc@thread.tacv2')/messages('1')"),
			);
		});

		it.each([
			['a channel', "teams('t')/channels('c')"],
			['a chat', "chats('x')"],
			['a team member', "teams('t')/members('m')"],
			['an unknown path', "users('u')/chats('x')/messages('1')"],
			['a non-string', 42],
			['a twice-encoded id', "teams('t1')/channels('19%253Aabc')/messages('1')"],
		])('returns nothing for %s', (_label, resource) => {
			expect(pathOf(resource)).toBeUndefined();
		});
	});

	describe('filterChangeNotifications', () => {
		const skipBot = { ...off, skipBotMessages: true };
		// A path that is not in the table gets a 404, so a wrong path cannot pass a filter.
		const routeMessages = (answers: Record<string, unknown>) =>
			request.mockImplementation(async (_ctx: unknown, _method: string, path: RequestPath) => {
				const answer = answers[String(path)] ?? apiError('404');
				if (answer instanceof Error) throw answer;
				return answer;
			});
		const messagePath = (id: string) => `/v1.0/teams/t1/channels/c1/messages/${id}`;

		it('skips resources without a message and caps the logged value', async () => {
			const ctx = ctxWith();
			const long = `teams('t')/channels('c')${'x'.repeat(200)}`;

			const result = await filterChangeNotifications.call(
				ctx,
				[notification('1', "teams('t')/channels('c')"), notification('2', long)],
				skipBot,
			);

			expect(result).toEqual({ passed: [] });
			expect(request).not.toHaveBeenCalled();
			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: notification without a message path skipped',
				expect.objectContaining({ resource: JSON.stringify(long.slice(0, 120)) }),
			);
		});

		it('logs the type of a resource that is not a string', async () => {
			const ctx = ctxWith();
			const odd = { ...notification('1'), resource: JSON.parse('{"toString":null}') as string };

			const result = await filterChangeNotifications.call(ctx, [odd], skipBot);

			expect(result).toEqual({ passed: [] });
			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: notification without a message path skipped',
				expect.objectContaining({ resource: 'object' }),
			);
		});

		it('reads the messages one after another', async () => {
			let resolveFirst: (value: unknown) => void = () => {};
			request.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						resolveFirst = resolve;
					}),
			);
			request.mockResolvedValueOnce(plainMessage);

			const pending = filterChangeNotifications.call(
				ctxWith(),
				[notification('1'), notification('2')],
				skipBot,
			);
			await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
			await new Promise((resolve) => setImmediate(resolve));
			expect(request).toHaveBeenCalledTimes(1);

			resolveFirst(plainMessage);
			expect((await pending).passed).toHaveLength(2);
			expect(readPaths()).toEqual([messagePath('1'), messagePath('2')]);
		});

		it('keeps reading after a 403 and returns the first one as denied', async () => {
			routeMessages({
				[messagePath('1')]: apiError('403'),
				[messagePath('2')]: apiError('403'),
				[messagePath('3')]: plainMessage,
			});
			const items = [notification('1'), notification('2'), notification('3')];

			const { passed, denied } = await filterChangeNotifications.call(ctxWith(), items, skipBot);

			expect(readPaths()).toEqual([messagePath('1'), messagePath('2'), messagePath('3')]);
			expect(passed).toEqual([items[2]]);
			expect(denied).toBeInstanceOf(NodeApiError);
			expect(denied?.httpCode).toBe('403');
			expect(denied?.message).toBe('Microsoft Teams Trigger could not read the message');
			expect(denied?.description).toContain('ChannelMessage.Read.All');
		});

		it('keeps an item that passed before a 403', async () => {
			routeMessages({
				[messagePath('1')]: plainMessage,
				[messagePath('2')]: apiError('403'),
				[messagePath('3')]: plainMessage,
			});
			const items = [notification('1'), notification('2'), notification('3')];

			const { passed } = await filterChangeNotifications.call(ctxWith(), items, skipBot);

			expect(passed).toEqual([items[0], items[2]]);
			expect(readPaths()).toHaveLength(3);
		});

		it('handles a 401 like a 403 and keeps the first denied error', async () => {
			routeMessages({ [messagePath('1')]: apiError('401'), [messagePath('2')]: apiError('403') });

			const { denied } = await filterChangeNotifications.call(
				ctxWith(),
				[notification('1'), notification('2')],
				skipBot,
			);

			expect(readPaths()).toEqual([messagePath('1'), messagePath('2')]);
			expect(denied?.httpCode).toBe('401');
		});

		it('returns a revoked credential as denied and stops reading', async () => {
			const revoked = reconnectError();
			routeMessages({ [messagePath('1')]: revoked, [messagePath('2')]: plainMessage });

			const { passed, denied } = await filterChangeNotifications.call(
				ctxWith(),
				[notification('1'), notification('2')],
				skipBot,
			);

			expect(denied).toBe(revoked);
			expect(denied?.httpCode).toBeNull();
			expect(denied?.message).toContain('needs to be reconnected');
			expect(passed).toEqual([]);
			expect(readPaths()).toEqual([messagePath('1')]);
		});

		it('finds the revoked mark on the wrapped error when the classes differ', async () => {
			// Core and the node can load different copies of n8n-workflow: then the wrapper does not
			// copy `failure`, and only the wrapped error carries it.
			const inner = Object.assign(new Error('The credential "Teams" needs to be reconnected.'), {
				failure: { cause: 'credential-invalid' },
			});
			const revoked = new NodeApiError(mock<INode>(), inner as unknown as JsonObject);
			expect(revoked.failure).toBeUndefined();
			routeMessages({ [messagePath('1')]: revoked });

			const { denied } = await filterChangeNotifications.call(
				ctxWith(),
				[notification('1')],
				skipBot,
			);

			expect(denied).toBe(revoked);
		});

		it('returns a revoked credential as denied after an earlier 403', async () => {
			const revoked = reconnectError();
			routeMessages({ [messagePath('1')]: apiError('403'), [messagePath('2')]: revoked });

			const { denied } = await filterChangeNotifications.call(
				ctxWith(),
				[notification('1'), notification('2')],
				skipBot,
			);

			expect(denied).toBe(revoked);
		});

		it('names Chat.Read for a chat message', async () => {
			request.mockRejectedValue(apiError('403'));

			const { denied } = await filterChangeNotifications.call(
				ctxWith(),
				[notification('1', "chats('c1')/messages('1')")],
				skipBot,
			);

			expect(denied?.description).toContain('Chat.Read');
		});

		it('skips a message that is gone', async () => {
			routeMessages({ [messagePath('1')]: apiError('404'), [messagePath('2')]: plainMessage });
			const ctx = ctxWith();
			const items = [notification('1'), notification('2')];

			const result = await filterChangeNotifications.call(ctx, items, skipBot);

			expect(result).toEqual({ passed: [items[1]] });
			expect(ctx.logger.debug).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: message gone, notification skipped',
				expect.objectContaining({ messageId: '1' }),
			);
		});

		it('warns with capped ids on a throttled read and keeps going', async () => {
			const longId = 'm'.repeat(100);
			const throttled = { ...notification('1'), subscriptionId: 's'.repeat(100) };
			throttled.resourceData = { id: longId };
			routeMessages({ [messagePath('1')]: apiError('429'), [messagePath('2')]: plainMessage });
			const ctx = ctxWith();

			const result = await filterChangeNotifications.call(
				ctx,
				[throttled, notification('2')],
				skipBot,
			);

			expect(result.passed).toHaveLength(1);
			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: failed to read message, notification skipped',
				expect.objectContaining({
					status: '429',
					subscriptionId: 's'.repeat(64),
					messageId: 'm'.repeat(64),
				}),
			);
		});

		it('caps the logged error text', async () => {
			routeMessages({ [messagePath('1')]: new Error('e'.repeat(300)) });
			const ctx = ctxWith();

			await filterChangeNotifications.call(ctx, [notification('1')], skipBot);

			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: failed to read message, notification skipped',
				expect.objectContaining({ error: 'e'.repeat(200) }),
			);
		});

		describe('Mentions Me user id', () => {
			const mentionsMe = { ...off, mentionsMe: true };
			const mentioning = (id: string) => ({ mentions: [{ mentioned: { user: { id } } }] });

			it('reads /me once for each batch and ignores a stored id', async () => {
				routeMessages({
					'/v1.0/me': { id: 'me' },
					[messagePath('1')]: mentioning('me'),
					[messagePath('2')]: mentioning('old'),
				});
				const items = [notification('1'), notification('2')];

				// `old` is a stale stored id. Message 2 mentions it and must not pass.
				const { passed } = await filterChangeNotifications.call(
					ctxWith({}, { mentionUserId: 'old' }),
					items,
					mentionsMe,
				);

				expect(passed).toEqual([items[0]]);
				expect(readPaths()).toEqual(['/v1.0/me', messagePath('1'), messagePath('2')]);
				expect(request.mock.calls[0][4]).toEqual({ $select: 'id' });
			});

			it('follows a change of the signed-in user between batches', async () => {
				const ctx = ctxWith();
				const items = [notification('1'), notification('2')];
				routeMessages({
					'/v1.0/me': { id: 'alice' },
					[messagePath('1')]: mentioning('alice'),
					[messagePath('2')]: mentioning('bob'),
				});
				const first = await filterChangeNotifications.call(ctx, items, mentionsMe);
				routeMessages({
					'/v1.0/me': { id: 'bob' },
					[messagePath('1')]: mentioning('alice'),
					[messagePath('2')]: mentioning('bob'),
				});

				const second = await filterChangeNotifications.call(ctx, items, mentionsMe);

				expect(first.passed).toEqual([items[0]]);
				expect(second.passed).toEqual([items[1]]);
				expect(readPaths().filter((path) => path === '/v1.0/me')).toHaveLength(2);
			});

			it('returns a 403 from /me as denied with a User.Read hint, without reading messages', async () => {
				routeMessages({ '/v1.0/me': apiError('403') });

				const result = await filterChangeNotifications.call(
					ctxWith(),
					[notification('1')],
					mentionsMe,
				);

				expect(result.passed).toEqual([]);
				expect(result.denied?.httpCode).toBe('403');
				expect(result.denied?.message).toBe(
					'Microsoft Teams Trigger could not read the signed-in user',
				);
				expect(result.denied?.description).toContain('User.Read');
				expect(readPaths()).toEqual(['/v1.0/me']);
			});

			it('returns a 401 from /me as denied with its own text', async () => {
				const unauthorized = apiError('401');
				routeMessages({ '/v1.0/me': unauthorized });

				const result = await filterChangeNotifications.call(
					ctxWith(),
					[notification('1')],
					mentionsMe,
				);

				expect(result).toEqual({ passed: [], denied: unauthorized });
			});

			it('returns a revoked credential on /me as denied', async () => {
				const revoked = reconnectError();
				routeMessages({ '/v1.0/me': revoked });

				const result = await filterChangeNotifications.call(
					ctxWith(),
					[notification('1')],
					mentionsMe,
				);

				expect(result).toEqual({ passed: [], denied: revoked });
			});

			it.each([
				['a 429', apiError('429')],
				['an empty id', { id: '' }],
			])('skips the batch without reading messages after %s from /me', async (_label, answer) => {
				routeMessages({ '/v1.0/me': answer });
				const ctx = ctxWith();

				const result = await filterChangeNotifications.call(ctx, [notification('1')], mentionsMe);

				expect(result).toEqual({ passed: [] });
				expect(readPaths()).toEqual(['/v1.0/me']);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: could not read the signed-in user, Mentions Me notifications skipped',
					expect.anything(),
				);
			});

			it('does not read /me when Mentions Me is off', async () => {
				routeMessages({ [messagePath('1')]: plainMessage });

				await filterChangeNotifications.call(ctxWith(), [notification('1')], skipBot);

				expect(readPaths()).toEqual([messagePath('1')]);
			});
		});
	});
});
