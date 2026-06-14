import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Sms77V2 } from '../v2/Sms77V2.node';

interface MockOptions {
	resource: string;
	operation: string;
	parameters?: Record<string, unknown>;
	apiResponses?: unknown[];
	apiRejection?: Error;
	continueOnFail?: boolean;
	itemCount?: number;
}

const buildExecuteContext = ({
	resource,
	operation,
	parameters = {},
	apiResponses = [{ success: true }],
	apiRejection,
	continueOnFail = false,
	itemCount = 1,
}: MockOptions) => {
	let callIndex = 0;
	const requestSpy = jest.fn().mockImplementation(async () => {
		if (apiRejection) throw apiRejection;
		const next = apiResponses[callIndex] ?? apiResponses[apiResponses.length - 1];
		callIndex += 1;
		return next;
	});

	const ctx = {
		getInputData: jest
			.fn()
			.mockReturnValue(Array.from({ length: itemCount }, () => ({ json: {} }))),
		getNodeParameter: jest.fn((name: string, _i: number, fallback?: unknown) => {
			if (name === 'resource') return resource;
			if (name === 'operation') return operation;
			if (name in parameters) return parameters[name];
			return fallback;
		}),
		getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
		continueOnFail: jest.fn().mockReturnValue(continueOnFail),
		helpers: {
			requestWithAuthentication: requestSpy,
			returnJsonArray: jest.fn((data: unknown[]) =>
				data.map((d) => ({ json: d })),
			) as unknown as IExecuteFunctions['helpers']['returnJsonArray'],
		},
	} as unknown as IExecuteFunctions;

	return { ctx, requestSpy };
};

const runExecute = async (
	ctx: IExecuteFunctions,
): Promise<{ items: INodeExecutionData[]; error?: Error }> => {
	const node = new Sms77V2({
		displayName: 'seven',
		name: 'sms77',
		icon: 'file:seven.svg',
		group: ['transform'],
		description: 'seven node test fixture',
	});
	try {
		const [items] = await node.execute.call(ctx);
		return { items };
	} catch (error) {
		return { items: [], error: error as Error };
	}
};

describe('Sms77V2 execute', () => {
	describe('SMS resource', () => {
		it('send: posts to /sms with required and additional fields', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'sms',
				operation: 'send',
				parameters: {
					to: '+49170123456789',
					text: 'hi',
					additionalFields: { from: 'seven', flash: true, ttl: 60 },
				},
			});

			await runExecute(ctx);

			expect(requestSpy).toHaveBeenCalledTimes(1);
			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/sms',
				body: { to: '+49170123456789', text: 'hi', from: 'seven', flash: true, ttl: 60 },
			});
		});

		it('delete: parses comma-separated ids and posts as DELETE /sms', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'sms',
				operation: 'delete',
				parameters: { ids: '111, 222 ,333' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'DELETE',
				uri: 'https://gateway.seven.io/api/sms',
				body: { ids: ['111', '222', '333'] },
			});
		});
	});

	describe('Voice resource', () => {
		it('send: posts to /voice', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'voice',
				operation: 'send',
				parameters: {
					to: '+49170123456789',
					text: 'hello',
					additionalFields: { ringtime: 20, from: '+4900000' },
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/voice',
				body: { to: '+49170123456789', text: 'hello', ringtime: 20, from: '+4900000' },
			});
		});

		it('hangup: posts to /voice/:callId/hangup with URL-encoded ID', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'voice',
				operation: 'hangup',
				parameters: { callId: 'abc/123' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].uri).toBe(
				'https://gateway.seven.io/api/voice/abc%2F123/hangup',
			);
		});
	});

	describe('RCS resource', () => {
		it('send: uses richContent over plain text when present', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'rcs',
				operation: 'send',
				parameters: {
					to: '+49170123456789',
					text: 'plain fallback',
					additionalFields: { richContent: { contentType: 'text', text: 'rich' } },
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].body).toMatchObject({
				to: '+49170123456789',
				text: { contentType: 'text', text: 'rich' },
			});
		});

		it('sendEvent: posts to /rcs/events', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'rcs',
				operation: 'sendEvent',
				parameters: {
					to: '+49170123456789',
					event: 'IS_TYPING',
					additionalFields: {},
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/rcs/events',
				body: { to: '+49170123456789', event: 'IS_TYPING' },
			});
		});
	});

	describe('WhatsApp resource', () => {
		it('send text: posts text body to /waba/messages', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'whatsapp',
				operation: 'send',
				parameters: {
					from: '+4900000',
					to: '+49170123456789',
					type: 'text',
					text: 'hello',
					additionalFields: {},
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/waba/messages',
				body: { from: '+4900000', to: '+49170123456789', type: 'text', text: 'hello' },
			});
		});

		it('send template: parses components JSON and posts template body', async () => {
			const components = { body: [{ type: 'text', text: 'Hello' }] };
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'whatsapp',
				operation: 'send',
				parameters: {
					from: '+4900000',
					to: '+49170123456789',
					type: 'template',
					template: 'welcome',
					language: 'en',
					components: JSON.stringify(components),
					additionalFields: {},
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].body).toMatchObject({
				type: 'template',
				template: 'welcome',
				language: 'en',
				components,
			});
		});
	});

	describe('Lookup resource', () => {
		it.each([
			['format', '/lookup/format'],
			['hlr', '/lookup/hlr'],
			['mnp', '/lookup/mnp'],
			['cnam', '/lookup/cnam'],
		])('%s: GET %s with number qs', async (operation, expectedPath) => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'lookup',
				operation,
				parameters: { number: '+49170123456789' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'GET',
				uri: `https://gateway.seven.io/api${expectedPath}`,
				qs: { number: '+49170123456789' },
			});
		});

		it('rcs: includes from when provided', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'lookup',
				operation: 'rcs',
				parameters: { number: '+49170123456789', from: 'agent_id_123' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].qs).toEqual({
				number: '+49170123456789',
				from: 'agent_id_123',
			});
		});
	});

	describe('Account resource', () => {
		it('getBalance: GET /balance', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'account',
				operation: 'getBalance',
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'GET',
				uri: 'https://gateway.seven.io/api/balance',
			});
		});

		it('getPricing: forwards country and format as query params', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'account',
				operation: 'getPricing',
				parameters: { country: 'DE', format: 'json' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].qs).toEqual({ country: 'DE', format: 'json' });
		});

		it('getAnalytics: forwards filters as query params', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'account',
				operation: 'getAnalytics',
				parameters: { filters: { start: '2026-01-01', group_by: 'date' } },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].qs).toMatchObject({
				start: '2026-01-01',
				group_by: 'date',
			});
		});
	});

	describe('Journal resource', () => {
		it('getOutbound: GET /journal/outbound with filters', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'journal',
				operation: 'getOutbound',
				parameters: { filters: { date_from: '2026-01-01', limit: 50 } },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'GET',
				uri: 'https://gateway.seven.io/api/journal/outbound',
				qs: { date_from: '2026-01-01', limit: 50 },
			});
		});
	});

	describe('Sender Identifier resource', () => {
		it('validateForVoice: posts number, includes callback URL when provided', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'senderId',
				operation: 'validateForVoice',
				parameters: { number: '+4900000', callback: 'https://example.com/cb' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].body).toEqual({
				number: '+4900000',
				callback: 'https://example.com/cb',
			});
		});
	});

	describe('Number resource', () => {
		it('getAvailable: GET /numbers/available with filters', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'number',
				operation: 'getAvailable',
				parameters: { filters: { country: 'DE', features_voice: true } },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				uri: 'https://gateway.seven.io/api/numbers/available',
				qs: { country: 'DE', features_voice: true },
			});
		});

		it('order: POST /numbers/order with payment interval', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'number',
				operation: 'order',
				parameters: { number: '+4912345', payment_interval: 'monthly' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/numbers/order',
				body: { number: '+4912345', payment_interval: 'monthly' },
			});
		});

		it('update: splits comma-separated forwards into arrays', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'number',
				operation: 'update',
				parameters: {
					number: '+4912345',
					updateFields: {
						friendly_name: 'main',
						sms_forward: '+4900001, +4900002',
						email_forward: 'a@b.com,c@d.com',
					},
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'PATCH',
				uri: 'https://gateway.seven.io/api/numbers/active/%2B4912345',
				body: {
					friendly_name: 'main',
					sms_forward: ['+4900001', '+4900002'],
					email_forward: ['a@b.com', 'c@d.com'],
				},
			});
		});
	});

	describe('Contact resource', () => {
		it('getAll non-paginated: forwards limit and filters', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'contact',
				operation: 'getAll',
				parameters: {
					returnAll: false,
					limit: 50,
					filters: { search: 'foo', group_id: 1 },
				},
				apiResponses: [{ data: [{ id: 1 }, { id: 2 }] }],
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1].qs).toMatchObject({
				limit: 50,
				search: 'foo',
				group_id: 1,
			});
		});

		it('create: posts payload, normalizes groups string into number array', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'contact',
				operation: 'create',
				parameters: {
					contactPayload: { firstname: 'Alice', mobile_number: '+49170', groups: '1, 2,3' },
				},
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/contacts',
				body: { firstname: 'Alice', mobile_number: '+49170', groups: [1, 2, 3] },
			});
		});

		it('update: PATCH /contacts/:id', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'contact',
				operation: 'update',
				parameters: { contactId: 'c-42', contactPayload: { city: 'Berlin' } },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'PATCH',
				uri: 'https://gateway.seven.io/api/contacts/c-42',
				body: { city: 'Berlin' },
			});
		});
	});

	describe('Group resource', () => {
		it('create: POST /groups', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'group',
				operation: 'create',
				parameters: { name: 'VIPs' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/groups',
				body: { name: 'VIPs' },
			});
		});

		it('delete: DELETE /groups/:id with delete_contacts flag', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'group',
				operation: 'delete',
				parameters: { groupId: '17', delete_contacts: true },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'DELETE',
				uri: 'https://gateway.seven.io/api/groups/17',
				body: { delete_contacts: true },
			});
		});
	});

	describe('Subaccount resource', () => {
		it('create: action=create with name and email', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'subaccount',
				operation: 'create',
				parameters: { name: 'Sub Co', email: 'sub@example.com' },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				method: 'POST',
				uri: 'https://gateway.seven.io/api/subaccounts',
				qs: { action: 'create' },
				body: { name: 'Sub Co', email: 'sub@example.com' },
			});
		});

		it('transferCredits: action=transfer_credits', async () => {
			const { ctx, requestSpy } = buildExecuteContext({
				resource: 'subaccount',
				operation: 'transferCredits',
				parameters: { subaccountId: '99', amount: 10 },
			});

			await runExecute(ctx);

			expect(requestSpy.mock.calls[0][1]).toMatchObject({
				qs: { action: 'transfer_credits' },
				body: { id: '99', amount: 10 },
			});
		});
	});

	describe('Error handling', () => {
		it('rethrows API errors when continueOnFail is false', async () => {
			const { ctx } = buildExecuteContext({
				resource: 'sms',
				operation: 'send',
				parameters: { to: '+49170', text: 'hi', additionalFields: {} },
				apiRejection: Object.assign(new Error('upstream error'), { name: 'NodeApiError' }),
			});

			const result = await runExecute(ctx);
			expect(result.error).toBeDefined();
		});

		it('captures API errors as items when continueOnFail is true', async () => {
			const { ctx } = buildExecuteContext({
				resource: 'sms',
				operation: 'send',
				parameters: { to: '+49170', text: 'hi', additionalFields: {} },
				apiRejection: Object.assign(new Error('upstream error'), { name: 'NodeApiError' }),
				continueOnFail: true,
			});

			const result = await runExecute(ctx);
			expect(result.error).toBeUndefined();
			expect(result.items).toHaveLength(1);
			expect((result.items[0].json as { error?: string }).error).toContain('upstream error');
		});
	});
});
