import type {
	IDataObject,
	IExecuteFunctions,
	NodeOperationError,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const CALLER = '00000000-1111-2222-3333-444444444444';
const ME_UPN = 'me@contoso.com';
const JANE = '714c1202-cbac-40ff-9160-53ab5c4df9b8';
const BOB = '22222222-3333-4444-5555-666666666666';
const OTHER_TENANT = '4dc1fe35-8ac6-4f0d-904a-7ebcd364bea1';

describe('Microsoft Teams V2, chat create participant rows', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		// The body's `user@odata.bind` is absolute, so the operation reads the credential
		// before it builds the body; the cases that get that far need one.
		ctx.getCredentials.mockResolvedValue({});
	});

	const notFound = () =>
		new NodeApiError(ctx.getNode(), {
			code: 'Request_ResourceNotFound',
			message: 'Resource not found',
			statusCode: 404,
		});

	/** Graph doubles: `/me` is the caller, `routes` are the per-path replies, the rest 404s. */
	const respond = (routes: Record<string, IDataObject> = {}, me: IDataObject = {}) => {
		apiRequest.mockImplementation(async (method: string, resourcePath: string) => {
			if (method === 'POST') return { id: 'created' };
			if (resourcePath === '/v1.0/me') {
				return { id: CALLER, userPrincipalName: ME_UPN, userType: 'Member', ...me };
			}
			if (resourcePath in routes) return routes[resourcePath];
			// the mail fallback, when the case does not override it
			if (resourcePath === '/v1.0/users') return { value: [] };
			throw notFound();
		});
	};

	const postBodies = () =>
		apiRequest.mock.calls
			.filter((call) => call[0] === 'POST')
			.map((call) => call[2] as IDataObject);

	const memberSent = (n: number) => (postBodies()[0].members as IDataObject[])[n];

	const run = async (params: Record<string, unknown>) => {
		setParams(ctx, { resource: 'chat', operation: 'create', ...params });
		return await node.execute.call(ctx);
	};

	/** One row per entry, addressed the way the operation reads them out of the fixedCollection. */
	const rows = (...values: Array<Record<string, unknown> & { userId: string }>) => ({
		'members.member': values.map(({ userId: _userId, ...rest }) => rest),
		...Object.fromEntries(values.map((row, n) => [`members.member[${n}].userId`, row.userId])),
	});

	it('refuses a group chat with no other participants', async () => {
		respond();

		await expect(run({ chatType: 'group', 'members.member': [] })).rejects.toThrow(
			'Add at least one other person to the chat',
		);
		expect(postBodies()).toEqual([]);
	});

	// An expression can resolve the field to a single value. Dropping every row and reporting an
	// empty participant list would point the operator at the wrong thing.
	it('refuses a participant list that is not a list', async () => {
		respond();

		await expect(run({ chatType: 'group', 'members.member': { userId: JANE } })).rejects.toThrow(
			'Other Participants must be a list of participants',
		);
		expect(postBodies()).toEqual([]);
	});

	it('refuses a chat whose only participant is the signed-in user', async () => {
		respond({ [`/v1.0/users/${encodeURIComponent(ME_UPN)}`]: { id: CALLER } });

		await expect(
			run({ chatType: 'oneOnOne', ...rows({ userId: ME_UPN, role: 'owner' }) }),
		).rejects.toThrow('Add at least one other person to the chat');
		expect(postBodies()).toEqual([]);
	});

	// The federated row binds its value without a lookup, so only a dedupe set seeded with the
	// caller's principal name (not just their id) catches it.
	it('recognises the signed-in user on a federated row by principal name', async () => {
		respond();

		await expect(
			run({
				chatType: 'group',
				...rows({ userId: 'Me@Contoso.com', role: 'owner', tenantId: OTHER_TENANT }),
			}),
		).rejects.toThrow('Add at least one other person to the chat');
		expect(postBodies()).toEqual([]);
	});

	it('refuses a one-on-one chat with two other participants', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE }, [`/v1.0/users/${BOB}`]: { id: BOB } });

		await expect(
			run({
				chatType: 'oneOnOne',
				...rows({ userId: JANE, role: 'owner' }, { userId: BOB, role: 'owner' }),
			}),
		).rejects.toThrow('A one-on-one chat needs exactly one other person');
		expect(postBodies()).toEqual([]);
	});

	it('refuses two participants who are the same person', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE } });

		await expect(
			run({
				chatType: 'group',
				...rows({ userId: JANE, role: 'owner' }, { userId: JANE, role: 'owner' }),
			}),
		).rejects.toThrow('Two participants are the same person (participant 2)');
		expect(postBodies()).toEqual([]);
	});

	it('reports the row when Graph cannot find the participant', async () => {
		respond();

		await expect(
			run({ chatType: 'group', ...rows({ userId: 'ghost@contoso.com', role: 'owner' }) }),
		).rejects.toThrow('Could not find the user for participant 1');
		expect(postBodies()).toEqual([]);
	});

	// A collection option default only materialises once the option is added, so a hand-edited or
	// AI-authored row can reach the runtime with no `role` at all.
	it('falls back to Owner for a participant with no role', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE } });

		await run({ chatType: 'group', ...rows({ userId: JANE }) });

		expect(postBodies()[0].members).toEqual([
			expect.objectContaining({ roles: ['owner'] }),
			expect.objectContaining({
				roles: ['owner'],
				'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${JANE}')`,
			}),
		]);
	});

	// Graph requires the `guest` role for an in-tenant guest, so a guest caller cannot be added
	// as the owner the node would otherwise default them to.
	it('adds a guest signed-in user with the guest role', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE } }, { userType: 'Guest' });

		await run({ chatType: 'oneOnOne', ...rows({ userId: JANE, role: 'owner' }) });

		expect(memberSent(0)).toEqual(expect.objectContaining({ roles: ['guest'] }));
	});

	// The editor hides Topic on a one-on-one chat, but a hand-edited or AI-authored parameter set
	// can still carry it, and Graph rejects a topic there.
	it('leaves the topic out of a one-on-one chat', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE } });

		await run({
			chatType: 'oneOnOne',
			topic: 'Release planning',
			...rows({ userId: JANE, role: 'owner' }),
		});

		expect(postBodies()[0]).not.toHaveProperty('topic');
	});

	// A blank Tenant ID must not read as federated: that skips the lookup and ships the blanks
	// to Graph as a member-level tenant.
	it('treats a whitespace-only tenant ID as no tenant ID', async () => {
		respond({ [`/v1.0/users/${JANE}`]: { id: JANE } });

		await run({ chatType: 'group', ...rows({ userId: JANE, role: 'owner', tenantId: '   ' }) });

		expect(apiRequest).toHaveBeenCalledWith('GET', `/v1.0/users/${JANE}`, {}, expect.anything());
		expect(memberSent(1)).toEqual({
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			roles: ['owner'],
			'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${JANE}')`,
		});
	});

	// The user-target regexes are anchored while the RLC's own By ID editor regex tolerates
	// trailing whitespace, so a pasted value has to be trimmed before it is validated.
	it('accepts a federated participant whose ID has a trailing space', async () => {
		respond();

		await run({
			chatType: 'group',
			...rows({ userId: `${BOB} `, role: 'owner', tenantId: OTHER_TENANT }),
		});

		expect(memberSent(1)).toEqual({
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			roles: ['owner'],
			'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${BOB}')`,
			tenantId: OTHER_TENANT,
		});
	});

	describe('with two input items', () => {
		// `createExecuteContext` returns one item, so an `itemIndex` assertion would pass against a
		// hardcoded zero. These drive the failing value off the item index instead.
		const runPerItem = async (
			params: Record<string, unknown>,
			perItem: Record<string, string[]>,
		) => {
			ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			const all: Record<string, unknown> = { resource: 'chat', operation: 'create', ...params };
			ctx.getNodeParameter.mockImplementation(
				(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
					if (name in perItem) return perItem[name][itemIndex as number];
					return (name in all ? all[name] : fallback) as NodeParameterValueType;
				},
			);
			return (await node.execute.call(ctx).catch((error) => error)) as NodeOperationError;
		};

		it('names the empty row and the item it came from', async () => {
			respond({ [`/v1.0/users/${JANE}`]: { id: JANE }, [`/v1.0/users/${BOB}`]: { id: BOB } });

			const error = await runPerItem(
				{ chatType: 'group', 'members.member': [{ role: 'owner' }, { role: 'owner' }] },
				{
					'members.member[0].userId': [JANE, JANE],
					'members.member[1].userId': [BOB, ''],
				},
			);

			expect(error.message).toBe('No user selected for participant 2');
			expect(error.context.itemIndex).toBe(1);
			// only the first item got as far as the request
			expect(postBodies()).toHaveLength(1);
		});

		it('names the bad federated row and the item it came from', async () => {
			respond();

			const error = await runPerItem(
				{
					chatType: 'group',
					'members.member': [{ role: 'owner', tenantId: OTHER_TENANT }],
				},
				{ 'members.member[0].userId': [JANE, 'x/../users/me'] },
			);

			expect(error.message).toBe('The user for participant 1 is not valid');
			expect(error.context.itemIndex).toBe(1);
			expect(postBodies()).toHaveLength(1);
		});
	});
});
