import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodePropertyRegexValidation,
	NodeParameterValueType,
} from 'n8n-workflow';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { meetingRLC } from '../../../../v2/descriptions';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

// Real transport except the network helper, so buildTeamsPath/validateTeamsId
// run for real; only microsoftApiRequest is stubbed.
vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const byId = (value: string) => ({ __rl: true, mode: 'id', value });
const byUrl = (value: string) => ({ __rl: true, mode: 'url', value });

describe('Microsoft Teams V2 — onlineMeeting:get lookup handling', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType =>
				(name in params ? params[name] : fallback) as NodeParameterValueType,
		);
	};

	const joinWebUrl =
		'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d';

	it.each([
		['with the __rl marker', byUrl(joinWebUrl)],
		['without the __rl marker', { mode: 'url', value: joinWebUrl }],
	])(
		'queries Graph with the documented JoinWebUrl OData filter and unwraps value[0] (%s)',
		async (_label, meetingId) => {
			(transport.microsoftApiRequest as Mock).mockResolvedValue({ value: [{ id: 'meeting-1' }] });
			setParams({ resource: 'onlineMeeting', operation: 'get', meetingId });

			const result = await node.execute.call(ctx);

			expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/me/onlineMeetings',
				{},
				{ $filter: `JoinWebUrl eq '${joinWebUrl}'` },
			);
			expect(result).toEqual([[{ json: { id: 'meeting-1' } }]]);
		},
	);

	it('doubles single quotes in the join URL to keep the OData literal intact', async () => {
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ value: [{ id: 'meeting-1' }] });
		setParams({
			resource: 'onlineMeeting',
			operation: 'get',
			meetingId: byUrl("https://teams.microsoft.com/l/meetup-join/o'brien"),
		});

		await node.execute.call(ctx);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/me/onlineMeetings',
			{},
			{ $filter: "JoinWebUrl eq 'https://teams.microsoft.com/l/meetup-join/o''brien'" },
		);
	});

	it('throws a clear error when no meeting matches the join URL', async () => {
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ value: [] });
		setParams({
			resource: 'onlineMeeting',
			operation: 'get',
			meetingId: byUrl('https://teams.microsoft.com/l/meetup-join/unknown'),
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'No meeting was found for the provided join URL',
		);
	});

	it('throws on a blank join URL before any request', async () => {
		setParams({ resource: 'onlineMeeting', operation: 'get', meetingId: byUrl(' ') });

		await expect(node.execute.call(ctx)).rejects.toThrow('The meeting join URL is empty');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each([
		['url', null, 'The meeting join URL is empty'],
		['url', { nested: true }, 'The meeting join URL is empty'],
		['id', null, 'A required ID is empty'],
		['id', ['x'], 'A required ID is empty'],
	])('fails before any request when the %s value resolves to %j', async (mode, value, message) => {
		setParams({
			resource: 'onlineMeeting',
			operation: 'get',
			meetingId: { __rl: true, mode, value },
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(message);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('treats a plain string meetingId as an ID', async () => {
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'meeting-1' });
		setParams({
			resource: 'onlineMeeting',
			operation: 'get',
			meetingId: 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
		});

		await node.execute.call(ctx);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/me/onlineMeetings/MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
		);
	});

	it.each(['get'])(
		'onlineMeeting:%s rejects a separator-bearing meetingId before any request',
		async (op) => {
			setParams({
				resource: 'onlineMeeting',
				operation: op,
				meetingId: byId('x/../../users/evil'),
			});

			// The path (and its validation) is built outside the op's try/catch, so the
			// validator's specific message surfaces instead of the generic "doesn't exist" one.
			await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
			expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		},
	);

	it.each([['get', "The meeting you are trying to get doesn't exist"]])(
		'replaces a Graph 404 on %s by ID with the friendly not-found message',
		async (op, message) => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				Object.assign(new Error('Not Found'), { httpCode: '404' }),
			);
			setParams({
				resource: 'onlineMeeting',
				operation: op,
				meetingId: byId('MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi'),
			});

			await expect(node.execute.call(ctx)).rejects.toThrow(message);
		},
	);

	it.each(['get'])(
		'rethrows a non-404 Graph error on %s unchanged (e.g. missing-scope 403)',
		async (op) => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				Object.assign(new Error('Insufficient privileges to complete the operation'), {
					httpCode: '403',
				}),
			);
			setParams({
				resource: 'onlineMeeting',
				operation: op,
				meetingId: byId('MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi'),
			});

			await expect(node.execute.call(ctx)).rejects.toThrow(
				'Insufficient privileges to complete the operation',
			);
		},
	);
});

describe('Microsoft Teams V2 — meeting resource locator', () => {
	const modePattern = (name: string) => {
		const mode = meetingRLC.modes?.find((candidate) => candidate.name === name);
		const validation = mode?.validation?.[0] as INodePropertyRegexValidation;
		return new RegExp(`^${validation.properties.regex}$`);
	};
	const joinUrlPattern = modePattern('url');
	const idPattern = modePattern('id');

	it.each([
		'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d',
		'https://gov.teams.microsoft.us/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0',
		' https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0 ',
		'',
	])('url mode accepts %j', (url) => {
		expect(joinUrlPattern.test(url)).toBe(true);
	});

	it.each([
		'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
		'https://teams.microsoft.com/meet/2345678901234?p=abc',
	])('url mode rejects %s, which the JoinWebUrl filter can never match', (value) => {
		expect(joinUrlPattern.test(value)).toBe(false);
	});

	it.each(['MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi', 'MSpk+YzE3=', ''])('id mode accepts %j', (id) => {
		expect(idPattern.test(id)).toBe(true);
	});

	it.each([
		'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0',
		'x/../../users/evil',
		'MSpk%2F',
	])('id mode rejects %s, which buildTeamsPath would refuse at run time', (id) => {
		expect(idPattern.test(id)).toBe(false);
	});
});
