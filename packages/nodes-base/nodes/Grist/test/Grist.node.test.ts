import type { ICredentialsDecrypted, ICredentialTestFunctions, INode } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Grist } from '../Grist.node';

describe('Grist credentialTest', () => {
	const run = async (
		orgs: unknown,
		data: ICredentialsDecrypted['data'] = { apiKey: 'k', url: 'https://api.getgrist.com' },
	) => {
		const request = vi.fn().mockResolvedValue(orgs);
		const testFns = mock<ICredentialTestFunctions>();
		testFns.helpers = { ...testFns.helpers, request };
		// Plain object (not a deep mock) so an absent `url` reads as undefined rather than an auto-mock.
		const credential = { data } as unknown as ICredentialsDecrypted;

		const result = await new Grist().methods.credentialTest.gristApiTest.call(testFns, credential);
		return { result, request };
	};

	it('passes when at least one org is accessible', async () => {
		const { result, request } = await run([{ id: 1, name: 'Personal' }]);

		expect(result.status).toBe('OK');
		expect(request.mock.calls[0][0].uri).toBe('https://api.getgrist.com/api/orgs');
		expect(request.mock.calls[0][0].headers.Authorization).toBe('Bearer k');
	});

	it('fails when no orgs are accessible', async () => {
		const { result } = await run([]);

		expect(result.status).toBe('Error');
		expect(result.message).toContain('no Grist organizations are accessible');
	});

	it('fails when the response is not an array', async () => {
		const { result } = await run({ unexpected: true });

		expect(result.status).toBe('Error');
	});

	it('reports the request error message on failure', async () => {
		const request = vi.fn().mockRejectedValue(new Error('Unauthorized'));
		const testFns = mock<ICredentialTestFunctions>();
		testFns.helpers = { ...testFns.helpers, request };
		const credential = {
			data: { apiKey: 'bad', url: 'https://api.getgrist.com' },
		} as unknown as ICredentialsDecrypted;

		const result = await new Grist().methods.credentialTest.gristApiTest.call(testFns, credential);

		expect(result.status).toBe('Error');
		expect(result.message).toBe('Unauthorized');
	});

	it('resolves the base URL from a legacy credential without a url', async () => {
		const { request } = await run([{ id: 1 }], {
			apiKey: 'k',
			selfHostedUrl: 'http://localhost:8484',
		});

		expect(request.mock.calls[0][0].uri).toBe('http://localhost:8484/api/orgs');
	});
});

describe('Grist authentication parameter', () => {
	// Workflows saved before the selector existed have no stored `authentication` value. Resolve a
	// node without one the way execution does, rather than asserting the declared default: adding
	// `displayOptions` to the parameter would drop it here while a default check still passed.
	it('resolves to the API key for a workflow saved without one', () => {
		const description = new Grist().description;
		const node: INode = {
			id: 'uuid-1234',
			name: 'Grist',
			type: 'n8n-nodes-base.grist',
			typeVersion: 1,
			position: [0, 0],
			parameters: { operation: 'getAll', docId: 'doc1', tableId: 'Table1' },
		};

		const resolved = NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			true,
			false,
			node,
			description,
		);

		expect(resolved?.authentication).toBe('apiKey');
	});
});
