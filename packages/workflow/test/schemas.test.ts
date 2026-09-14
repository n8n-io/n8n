import { INodeCredentialsDetailsSchema, normalizeNodeShape } from '../src/schemas';

describe('INodeCredentialsDetailsSchema', () => {
	it('accepts AI Gateway-managed credential entries', () => {
		const result = INodeCredentialsDetailsSchema.parse({
			id: null,
			name: '',
			__aiGatewayManaged: true,
		});

		expect(result).toEqual({ id: null, name: '', __aiGatewayManaged: true });
	});

	it('accepts real credential entries', () => {
		const result = INodeCredentialsDetailsSchema.parse({ id: 'cred-123', name: 'My credential' });

		expect(result).toEqual({ id: 'cred-123', name: 'My credential' });
	});
});

describe('normalizeNodeShape', () => {
	it('omits nullish optional top-level keys and coerces parameters to an object', () => {
		const result = normalizeNodeShape({
			id: '1',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [0, 0] as [number, number],
			parameters: null,
			credentials: null,
			webhookId: null,
			notes: undefined,
			retryOnFail: false,
		});

		expect(result).toEqual({
			id: '1',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [0, 0],
			parameters: {},
			retryOnFail: false,
		});
		expect(result).not.toHaveProperty('credentials');
		expect(result).not.toHaveProperty('webhookId');
		expect(result).not.toHaveProperty('notes');
	});

	it('preserves nested nulls and existing parameter objects', () => {
		const result = normalizeNodeShape({
			id: '1',
			name: 'Slack',
			parameters: { channel: 'general' },
			credentials: {
				slackApi: { id: null, name: 'Slack account' },
			},
		});

		expect(result.parameters).toEqual({ channel: 'general' });
		expect(result.credentials).toEqual({
			slackApi: { id: null, name: 'Slack account' },
		});
	});

	it('coerces missing or non-object parameters to {}', () => {
		expect(normalizeNodeShape({ id: '1' })).toEqual({ id: '1', parameters: {} });
		expect(normalizeNodeShape({ id: '1', parameters: 'bad' })).toEqual({
			id: '1',
			parameters: {},
		});
		expect(normalizeNodeShape({ id: '1', parameters: ['bad'] })).toEqual({
			id: '1',
			parameters: {},
		});
	});

	it('does not strip null for keys outside INodeSchema', () => {
		const result = normalizeNodeShape({
			id: '1',
			parameters: {},
			credentials: null,
			notInSchema: null,
		});

		expect(result).toEqual({ id: '1', parameters: {}, notInSchema: null });
	});

	it('does not strip null on required top-level keys', () => {
		const result = normalizeNodeShape({
			id: null,
			name: null,
			parameters: {},
		});

		expect(result).toEqual({ id: null, name: null, parameters: {} });
	});

	it('always omits undefined top-level values, including required keys', () => {
		const result = normalizeNodeShape({
			id: '1',
			name: undefined,
			parameters: {},
			notInSchema: undefined,
		});

		expect(result).toEqual({ id: '1', parameters: {} });
		expect(result).not.toHaveProperty('name');
		expect(result).not.toHaveProperty('notInSchema');
	});
});
