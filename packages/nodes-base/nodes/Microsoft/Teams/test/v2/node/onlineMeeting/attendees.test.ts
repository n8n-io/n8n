import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createExecuteContext, meetingHeaders, setParams } from '../helpers';
import {
	createOrGetAttendeesField,
	updateAttendeesField,
} from '../../../../v2/actions/onlineMeeting/attendees';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import { SERVICE_PRINCIPAL_AUTH } from '../../../../v2/transport';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const JANE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const ORGANIZER = '11111111-2222-3333-4444-555555555555';
const MEETING = 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi';
const MEETINGS = '/v1.0/me/onlineMeetings';
const JOIN_URL = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0';
const RESOLVE_QS = { $select: 'id,displayName,userPrincipalName' };
const FORBIDDEN_MESSAGE = 'Resolving attendees needs the User.Read.All application permission';

const graphUser = (id: string, displayName: string, userPrincipalName: string) => ({
	id,
	displayName,
	userPrincipalName,
});
const rlc = (mode: string, value: string) => ({ __rl: true, mode, value });
const entry = (id: string, upn: string, role: string) => ({
	identity: { user: { id } },
	upn,
	role,
});

const USERS: Record<string, IDataObject> = {
	[`/v1.0/users/${JANE}`]: graphUser(JANE, 'Jane Smith', 'jane@example.com'),
	[`/v1.0/users/${BOB}`]: graphUser(BOB, 'Bob Jones', 'bob@example.com'),
	'/v1.0/users/jane%40example.com': graphUser(JANE, 'Jane Smith', 'jane@example.com'),
	'/v1.0/users/bob%40example.com': graphUser(BOB, 'Bob Jones', 'bob@example.com'),
};

const createParams = {
	subject: 'Sync',
	startDateTime: '2026-09-10T10:00:00Z',
	endDateTime: '2026-09-10T10:30:00Z',
	options: {},
};

describe('Microsoft Teams V2, onlineMeeting attendees', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		apiRequest.mockReset();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const notFound = () =>
		new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' });
	const forbidden = () =>
		new NodeApiError(ctx.getNode(), { message: 'Forbidden' }, { httpCode: '403' });
	const throttled = () =>
		new NodeApiError(ctx.getNode(), { message: 'Too Many Requests' }, { httpCode: '429' });

	/**
	 * Answers user lookups from a directory and every meeting call with a stub meeting. An unknown
	 * user answers like Graph (404 by ID or UPN, an empty page from the mail filter) instead of
	 * returning the stub, which has an `id` and would pass as a user.
	 */
	const graph = (users: Record<string, IDataObject>) => {
		apiRequest.mockImplementation(async (_method: string, path: string) => {
			if (path in users) return users[path];
			if (path === '/v1.0/users') return { value: [] };
			if (/^\/v1\.0\/users\/[^/]+$/.test(path)) throw notFound();
			return { id: MEETING };
		});
	};

	const runCreate = async (rows: unknown[], extra: Record<string, unknown> = {}) => {
		setParams(ctx, {
			resource: 'onlineMeeting',
			operation: 'create',
			...createParams,
			attendees: { attendee: rows },
			...extra,
		});
		return await node.execute.call(ctx);
	};

	const runUpdate = async (
		updateFields: Record<string, unknown>,
		meetingId: unknown = rlc('id', MEETING),
	) => {
		setParams(ctx, { resource: 'onlineMeeting', operation: 'update', meetingId, updateFields });
		return await node.execute.call(ctx);
	};

	const runCreateOrGet = async (options: Record<string, unknown>) => {
		setParams(ctx, {
			resource: 'onlineMeeting',
			operation: 'createOrGet',
			externalId: 'order-4711',
			options,
		});
		return await node.execute.call(ctx);
	};

	const bodyOf = (method: string) =>
		apiRequest.mock.calls.find((call) => call[0] === method)?.[2] as IDataObject;
	const sentAttendees = (method: string) =>
		(bodyOf(method).participants as IDataObject).attendees as IDataObject[];
	const thrownBy = async (run: Promise<unknown>) => await run.catch((error: unknown) => error);

	it('sends every row with the resolved ID, principal name and role', async () => {
		graph(USERS);

		await runCreate([
			{ userId: rlc('list', JANE), role: 'attendee' },
			{ userId: rlc('list', BOB), role: 'presenter' },
		]);

		expect(apiRequest).toHaveBeenCalledWith('GET', `/v1.0/users/${JANE}`, {}, RESOLVE_QS);
		expect(sentAttendees('POST')).toEqual([
			entry(JANE, 'jane@example.com', 'attendee'),
			entry(BOB, 'bob@example.com', 'presenter'),
		]);
	});

	it('leaves the principal name out when Graph returns none', async () => {
		graph({ [`/v1.0/users/${JANE}`]: { id: JANE, displayName: 'Jane Smith' } });

		await runCreate([{ userId: rlc('list', JANE), role: 'attendee' }]);

		expect(sentAttendees('POST')[0]).toStrictEqual({
			identity: { user: { id: JANE } },
			role: 'attendee',
		});
	});

	it('looks a plain ID and a plain address up by the encoded path', async () => {
		graph(USERS);

		await runCreate([{ userId: JANE }, { userId: 'bob@example.com' }]);

		expect(apiRequest).toHaveBeenCalledWith('GET', `/v1.0/users/${JANE}`, {}, RESOLVE_QS);
		expect(apiRequest).toHaveBeenCalledWith('GET', '/v1.0/users/bob%40example.com', {}, RESOLVE_QS);
	});

	it('falls back to a mail lookup and sends the guest principal name', async () => {
		const guestUpn = 'alex_contoso.com#EXT#@tenant.onmicrosoft.com';
		apiRequest
			.mockRejectedValueOnce(notFound())
			.mockResolvedValueOnce({ value: [graphUser('guid-guest', 'Alex Guest', guestUpn)] })
			.mockResolvedValueOnce({ id: MEETING });

		await runCreate([{ userId: 'alex@contoso.com' }]);

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
		expect(sentAttendees('POST')[0]).toStrictEqual(entry('guid-guest', guestUpn, 'attendee'));
	});

	it.each<[string, IDataObject, string]>([
		[
			'two people share the address',
			{ value: [graphUser('guid-a', 'A', 'a@x.com'), graphUser('guid-b', 'B', 'b@x.com')] },
			'More than one user has that email address for attendee 1',
		],
		['nobody has the address', { value: [] }, 'Could not find the user for attendee 1'],
	])('rejects the row without a meeting call when %s', async (_label, byMail, message) => {
		apiRequest.mockRejectedValueOnce(notFound()).mockResolvedValueOnce(byMail);

		await expect(runCreate([{ userId: 'alex@contoso.com' }])).rejects.toThrow(message);
		expect(apiRequest).toHaveBeenCalledTimes(2);
	});

	it('names the row when a picker was added but never filled in', async () => {
		await expect(runCreate([{ userId: rlc('list', '') }])).rejects.toThrow(
			'No user selected for attendee 1',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a value with a path separator before any request', async () => {
		await expect(runCreate([{ userId: 'a/b' }])).rejects.toThrow(
			'The user for attendee 1 is not valid',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each<[string, () => unknown, string]>([
		[
			'a user without an ID',
			() => apiRequest.mockResolvedValue({ displayName: 'Ghost' }),
			'Could not find the user for attendee 1',
		],
		// The 429 text is n8n-workflow's status-code copy, not the node's, so only its presence is pinned.
		['a throttled lookup', () => apiRequest.mockRejectedValue(throttled()), expect.any(String)],
	])('does not cache %s, so the next item retries it', async (_label, arrange, message) => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		arrange();

		const [output] = await runCreate([{ userId: JANE }]);

		expect(output.map((item) => item.json)).toEqual([{ error: message }, { error: message }]);
		expect(apiRequest.mock.calls.map((call) => call[0])).toEqual(['GET', 'GET']);
	});

	it.each<[string, unknown[]]>([
		['a null row', [null]],
		['a string row', ['jane@example.com']],
		// A hole, which `every` would skip; only an expression can produce one.
		['a sparse list', Object.assign([], { 1: { userId: JANE } })],
	])('rejects %s as an invalid field before any request', async (_label, rows) => {
		await expect(runCreate(rows)).rejects.toThrow('The Attendees field is not valid');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each(['coorganizer', null, ''])('rejects the role %j before any request', async (role) => {
		await expect(runCreate([{ userId: JANE, role }])).rejects.toThrow(
			'The role for attendee 1 is not valid',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('checks every role before the first lookup', async () => {
		await expect(
			runCreate([
				{ userId: JANE, role: 'attendee' },
				{ userId: BOB, role: 'coorganizer' },
			]),
		).rejects.toThrow('The role for attendee 2 is not valid');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('defaults a missing role to attendee', async () => {
		graph(USERS);

		await runCreate([{ userId: JANE }]);

		expect(sentAttendees('POST')).toEqual([entry(JANE, 'jane@example.com', 'attendee')]);
	});

	// The "presenter row comes second" case is covered by "keeps the first position" below.
	it('collapses two rows for one person into a presenter when the presenter row comes first', async () => {
		graph(USERS);

		await runCreate([
			{ userId: 'jane@example.com', role: 'presenter' },
			{ userId: JANE, role: 'attendee' },
		]);

		expect(sentAttendees('POST')).toEqual([entry(JANE, 'jane@example.com', 'presenter')]);
	});

	it('looks a repeated ID up once', async () => {
		graph(USERS);

		await runCreate([{ userId: JANE }, { userId: JANE }]);

		expect(sentAttendees('POST')).toEqual([entry(JANE, 'jane@example.com', 'attendee')]);
		expect(apiRequest.mock.calls.filter((call) => call[0] === 'GET')).toHaveLength(1);
	});

	it('keeps the first position when a later row promotes the same person', async () => {
		graph(USERS);

		await runCreate([
			{ userId: JANE, role: 'attendee' },
			{ userId: BOB, role: 'attendee' },
			{ userId: 'jane@example.com', role: 'presenter' },
		]);

		expect(sentAttendees('POST')).toEqual([
			entry(JANE, 'jane@example.com', 'presenter'),
			entry(BOB, 'bob@example.com', 'attendee'),
		]);
	});

	it('resolves the same attendee once for two input items', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		graph(USERS);

		await runCreate([{ userId: JANE }]);

		expect(apiRequest.mock.calls.map((call) => call[0])).toEqual(['GET', 'POST', 'POST']);
	});

	it('adds the attendees to a Create or Get body', async () => {
		graph(USERS);

		await runCreateOrGet({ attendees: { attendee: [{ userId: JANE }] } });

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			`${MEETINGS}/createOrGet`,
			{
				externalId: 'order-4711',
				participants: { attendees: [entry(JANE, 'jane@example.com', 'attendee')] },
			},
			{},
			undefined,
			meetingHeaders,
		);
	});

	// No roleIsPresenter guard by design: Graph accepts Specific People without presenter rows, and
	// the presenters can be added later with Update.
	it('sends Specific People without any attendees', async () => {
		graph(USERS);

		await runCreate([], { options: { allowedPresenters: 'roleIsPresenter' } });

		expect(bodyOf('POST').allowedPresenters).toBe('roleIsPresenter');
		expect(bodyOf('POST')).not.toHaveProperty('participants');
	});

	it('sends Specific People with an attendee-only list as is', async () => {
		graph(USERS);

		await runCreate([{ userId: JANE, role: 'attendee' }], {
			options: { allowedPresenters: 'roleIsPresenter' },
		});

		expect(bodyOf('POST')).toEqual(
			expect.objectContaining({
				allowedPresenters: 'roleIsPresenter',
				participants: { attendees: [entry(JANE, 'jane@example.com', 'attendee')] },
			}),
		);
	});

	it('offers the attendees between End Time and Options on Create', () => {
		const names = versionDescription.properties
			.filter(
				(property) =>
					property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
					property.displayOptions?.show?.operation?.includes('create'),
			)
			.map((property) => property.name);

		expect(names).toEqual(['subject', 'startDateTime', 'endDateTime', 'attendees', 'options']);
	});

	it('offers the role only where Allowed Presenters exists', () => {
		const field = (operation: string, name: string) =>
			versionDescription.properties.find(
				(property) =>
					property.name === name &&
					property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
					property.displayOptions?.show?.operation?.includes(operation),
			);
		const inside = (container: INodeProperties | undefined) =>
			((container?.options ?? []) as INodeProperties[]).find(
				(option) => option.name === 'attendees',
			);
		const rowNames = (attendees: INodeProperties | undefined) =>
			((attendees?.options ?? []) as INodePropertyCollection[])[0]?.values.map(
				(value) => value.name,
			);

		expect(rowNames(field('create', 'attendees'))).toEqual(['userId', 'role']);
		expect(rowNames(inside(field('update', 'updateFields')))).toEqual(['userId', 'role']);
		expect(rowNames(inside(field('createOrGet', 'options')))).toEqual(['userId']);
	});

	// The collection-overhaul UI shows no description on the list itself, so the row fields carry
	// the note. A substring, so a rewording that keeps the promise survives.
	it.each<[string, INodeProperties, string]>([
		['Update', updateAttendeesField, 'replaces the current attendees'],
		['Create or Get', createOrGetAttendeesField, 'only when a new meeting is created'],
	])('repeats the %s note on every row field', (_label, attendees, note) => {
		const rows = (attendees.options as INodePropertyCollection[])[0].values;

		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) expect(row.description).toContain(note);
	});

	describe('update', () => {
		it('resolves the attendees before it looks the meeting up by join URL', async () => {
			apiRequest.mockRejectedValueOnce(notFound()).mockResolvedValueOnce({ value: [] });

			await expect(
				runUpdate(
					{ attendees: { attendee: [{ userId: 'ghost@example.com' }] } },
					rlc('url', JOIN_URL),
				),
			).rejects.toThrow('Could not find the user for attendee 1');
			expect(apiRequest.mock.calls.map((call) => call[1])).toEqual([
				'/v1.0/users/ghost%40example.com',
				'/v1.0/users',
			]);
		});

		const emptyLists: Array<[string, IDataObject]> = [
			['an empty field', {}],
			['a field with no rows', { attendee: [] }],
		];

		it.each(emptyLists)('rejects %s alone as nothing to update', async (_label, attendees) => {
			await expect(runUpdate({ attendees })).rejects.toThrow('No fields are set to update');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it.each(emptyLists)(
			'leaves the attendees alone when %s comes with a subject',
			async (_label, attendees) => {
				apiRequest.mockResolvedValue({ id: MEETING });

				await runUpdate({ attendees, subject: 'Renamed' });

				expect(bodyOf('PATCH')).toEqual({ subject: 'Renamed' });
			},
		);

		it('clears the attendees when Remove All Attendees is on', async () => {
			apiRequest.mockResolvedValue({ id: MEETING });

			await runUpdate({ removeAllAttendees: true });

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith(
				'PATCH',
				`${MEETINGS}/${MEETING}`,
				{ participants: { attendees: [] } },
				{},
				undefined,
				meetingHeaders,
			);
		});

		it('sends Remove All Attendees together with a subject', async () => {
			apiRequest.mockResolvedValue({ id: MEETING });

			await runUpdate({ removeAllAttendees: true, subject: 'Renamed' });

			expect(bodyOf('PATCH')).toEqual({ subject: 'Renamed', participants: { attendees: [] } });
		});

		it('rejects Remove All Attendees together with attendee rows before any request', async () => {
			await expect(
				runUpdate({ removeAllAttendees: true, attendees: { attendee: [{ userId: JANE }] } }),
			).rejects.toThrow('Remove All Attendees cannot be combined with Attendees');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('replaces the attendees when Remove All Attendees is off', async () => {
			graph(USERS);

			await runUpdate({ removeAllAttendees: false, attendees: { attendee: [{ userId: JANE }] } });

			expect(bodyOf('PATCH')).toEqual({
				participants: { attendees: [entry(JANE, 'jane@example.com', 'attendee')] },
			});
		});

		it('patches only the attendees when nothing else is set', async () => {
			graph(USERS);

			await runUpdate({ attendees: { attendee: [{ userId: JANE, role: 'presenter' }] } });

			expect(apiRequest).toHaveBeenCalledWith(
				'PATCH',
				`${MEETINGS}/${MEETING}`,
				{ participants: { attendees: [entry(JANE, 'jane@example.com', 'presenter')] } },
				{},
				undefined,
				meetingHeaders,
			);
		});

		it('sends no participants when the attendees field is left out', async () => {
			apiRequest.mockResolvedValue({ id: MEETING });

			await runUpdate({ subject: 'Renamed' });

			expect(bodyOf('PATCH')).not.toHaveProperty('participants');
		});

		it('treats a null attendees field as not set', async () => {
			await expect(runUpdate({ attendees: null })).rejects.toThrow('No fields are set to update');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it.each<[string, unknown]>([
			['null rows', { attendee: null }],
			['a string', 'x'],
			['a bare list of rows', [{ userId: JANE }]],
			['a wrong row key', { attendees: [{ userId: JANE }] }],
		])('rejects %s in the attendees field before any request', async (_label, attendees) => {
			await expect(runUpdate({ attendees })).rejects.toThrow('The Attendees field is not valid');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('keeps the meeting not-found rewrite after the lookups succeed', async () => {
			apiRequest
				.mockResolvedValueOnce(USERS[`/v1.0/users/${JANE}`])
				.mockRejectedValueOnce(notFound());

			await expect(runUpdate({ attendees: { attendee: [{ userId: JANE }] } })).rejects.toThrow(
				"The meeting you are trying to update doesn't exist",
			);
		});
	});

	describe('under the Service Principal credential', () => {
		const spParams = { authentication: SERVICE_PRINCIPAL_AUTH, organizerId: ORGANIZER };

		it('names User.Read.All when the lookup is forbidden', async () => {
			apiRequest.mockRejectedValue(forbidden());

			const thrown = await thrownBy(runCreate([{ userId: JANE }], spParams));

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect((thrown as NodeApiError).message).toBe(FORBIDDEN_MESSAGE);
			expect((thrown as NodeApiError).description).toContain('admin consent');
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('keeps an unknown user as not found, only a 403 is rewritten', async () => {
			apiRequest.mockRejectedValue(notFound());

			await expect(runCreate([{ userId: JANE }], spParams)).rejects.toThrow(
				'Could not find the user for attendee 1',
			);
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('stamps the failing item on a forbidden lookup for a later item', async () => {
			const rowsPerItem = [[{ userId: JANE }], [{ userId: BOB }]];
			ctx.getInputData.mockReturnValue(rowsPerItem.map(() => ({ json: {} })));
			const params: Record<string, unknown> = {
				...spParams,
				resource: 'onlineMeeting',
				operation: 'create',
				...createParams,
			};
			ctx.getNodeParameter.mockImplementation(
				(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
					if (name === 'attendees') {
						return { attendee: rowsPerItem[itemIndex ?? 0] } as NodeParameterValueType;
					}
					return (name in params ? params[name] : fallback) as NodeParameterValueType;
				},
			);
			apiRequest
				.mockResolvedValueOnce(USERS[`/v1.0/users/${JANE}`])
				.mockResolvedValueOnce({ id: MEETING })
				.mockRejectedValueOnce(forbidden());

			const thrown = await thrownBy(node.execute.call(ctx));

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect((thrown as NodeApiError).message).toBe(FORBIDDEN_MESSAGE);
			expect((thrown as NodeApiError).context.itemIndex).toBe(1);
		});

		it('rewrites a forbidden mail lookup too', async () => {
			apiRequest.mockRejectedValueOnce(notFound()).mockRejectedValueOnce(forbidden());

			const thrown = await thrownBy(runCreate([{ userId: 'alex@contoso.com' }], spParams));

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect((thrown as NodeApiError).message).toBe(FORBIDDEN_MESSAGE);
		});
	});

	it('passes a delegated permission failure through unchanged', async () => {
		const denied = forbidden();
		apiRequest.mockRejectedValue(denied);

		await expect(runCreate([{ userId: JANE }])).rejects.toBe(denied);
	});
});
