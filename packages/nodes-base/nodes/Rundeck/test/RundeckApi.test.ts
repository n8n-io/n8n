import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { RundeckApi } from '../RundeckApi';

function buildFunctions(credentials: IDataObject) {
	const requestWithAuthentication = vi.fn(async () => ({}));
	const getCredentials = vi.fn(async () => credentials);

	const functions = {
		getCredentials,
		getNode: vi.fn(
			() =>
				({
					id: 'rundeck-node',
					name: 'Rundeck',
					type: 'n8n-nodes-base.rundeck',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}) as INode,
		),
		helpers: {
			requestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	return { functions, requestWithAuthentication };
}

function requestOptions(requestWithAuthentication: Mock) {
	return requestWithAuthentication.mock.calls[0][1] as IDataObject;
}

describe('RundeckApi TLS certificate verification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('verifies the server certificate by default', async () => {
		const { functions, requestWithAuthentication } = buildFunctions({
			url: 'https://rundeck.example.com',
			token: 'token',
		});

		const api = new RundeckApi(functions);
		await api.init();
		await api.getJobMetadata('1');

		expect(requestOptions(requestWithAuthentication).rejectUnauthorized).toBe(true);
	});

	it('skips verification only when allowUnauthorizedCerts is enabled', async () => {
		const { functions, requestWithAuthentication } = buildFunctions({
			url: 'https://rundeck.example.com',
			token: 'token',
			allowUnauthorizedCerts: true,
		});

		const api = new RundeckApi(functions);
		await api.init();
		await api.getJobMetadata('1');

		expect(requestOptions(requestWithAuthentication).rejectUnauthorized).toBe(false);
	});
});
