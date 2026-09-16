import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createExecuteContext, meetingHeaders, setParams } from '../helpers';
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

	/** Answers user lookups from a directory and every meeting call with a stub meeting. */
	const graph = (users: Record<string, IDataObject>) => {
		apiRequest.mockImplementation(async (_method: string, path: string) =>
			path in users ? users[path] : { id: MEETING },
		);
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

	it.each<[string, IDataObject]>([
		[
			'two people share the address',
			{ value: [graphUser('guid-a', 'A', 'a@x.com'), graphUser('guid-b', 'B', 'b@x.com')] },
		],
		['nobody has the address', { value: [] }],
	])('reports the row as not found when %s', async (_label, byMail) => {
		apiRequest.mockRejectedValueOnce(notFound()).mockResolvedValueOnce(byMail);

		await expect(runCreate([{ userId: 'alex@contoso.com' }])).rejects.toThrow(
			'Could not find the user for attendee 1',
		);
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

	it('does not cache a user that came back without an ID', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockResolvedValue({ displayName: 'Ghost' });

		const [output] = await runCreate([{ userId: JANE }]);

		expect(output.map((item) => item.json)).toEqual([
			{ error: 'Could not find the user for attendee 1' },
			{ error: 'Could not find the user for attendee 1' },
		]);
		expect(apiRequest.mock.calls.map((call) => call[0])).toEqual(['GET', 'GET']);
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

	it.each<[string, IDataObject[]]>([
		[
			'the presenter row comes second',
			[
				{ userId: JANE, role: 'attendee' },
				{ userId: 'jane@example.com', role: 'presenter' },
			],
		],
		[
			'the presenter row comes first',
			[
				{ userId: 'jane@example.com', role: 'presenter' },
				{ userId: JANE, role: 'attendee' },
			],
		],
	])('collapses two rows for one person into a presenter when %s', async (_label, rows) => {
		graph(USERS);

		await runCreate(rows);

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

		it.each<[string, IDataObject]>([
			['an empty field', {}],
			['a field with no rows', { attendee: [] }],
		])('clears the attendees when %s is set', async (_label, attendees) => {
			apiRequest.mockResolvedValue({ id: MEETING });

			await runUpdate({ attendees });

			expect(apiRequest).toHaveBeenCalledWith(
				'PATCH',
				`${MEETINGS}/${MEETING}`,
				{ participants: { attendees: [] } },
				{},
				undefined,
				meetingHeaders,
			);
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
