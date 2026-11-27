import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { clearTokenCache, qualysApiRequest } from '../transport';
import type { QualysApiRequestOptions, QualysCredential } from '../transport';

type Sent = IHttpRequestOptions & { url: unknown };

function createContext(
	credentials: QualysCredential,
	authentication: 'apiClient' | 'basicAuth',
	nodeParameters: IDataObject = {},
) {
	const requestedCredentials: string[] = [];
	const sent: Sent[] = [];
	const httpRequest = vi.fn(async (options: Sent) => {
		sent.push(options);
		const path = String(options.url);

		if (path === '/auth') return { statusCode: 201, headers: {}, body: 'user-token' };
		if (path.startsWith('/auth/')) return { statusCode: 200, headers: {}, body: 'client-token' };

		const headers = options.headers as IDataObject;
		return {
			statusCode: 200,
			headers: {},
			body: headers.Accept === 'application/xml' ? '<R><A>1</A></R>' : '{"ok":true}',
		};
	});

	const context = {
		getCredentials: async (name: string) => {
			requestedCredentials.push(name);
			return credentials;
		},
		getNodeParameter: (name: string, _itemIndex: number, fallback: unknown) =>
			({ authentication, ...nodeParameters })[name] ?? fallback,
		getNode: () => ({
			id: '1',
			name: 'Qualys',
			type: 'n8n-nodes-base.qualys',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: { httpRequest },
	} as unknown as IExecuteFunctions;

	const call = async (options: QualysApiRequestOptions) =>
		await qualysApiRequest.call(context, options);

	return { sent, call, requestedCredentials };
}

// The `qualysApi` credential has no platform; the node supplies it.
const userCredentials: QualysCredential = {
	username: 'user',
	password: 'pa:ss',
	requestedWith: 'n8n application',
};

const clientCredentials: QualysCredential = {
	pod: 'us1',
	clientId: 'id',
	clientSecret: 'secret',
	clientGrant: 'oidc',
};

describe('qualysApiRequest', () => {
	beforeEach(() => clearTokenCache());

	it('should use HTTP Basic on the platform API for username and password', async () => {
		const { sent, call, requestedCredentials } = createContext(userCredentials, 'basicAuth', {
			pod: 'eu1',
		});

		const response = await call({ plane: 'fo', endpoint: '/api/5.0/fo/asset/host/', xml: true });

		expect(requestedCredentials).toEqual(['qualysApi']);
		expect(sent).toHaveLength(1);
		expect(sent[0].baseURL).toBe('https://qualysapi.qualys.eu');
		expect(String(sent[0].url)).toBe('/api/5.0/fo/asset/host/');
		expect(sent[0].headers).toMatchObject({
			Authorization: `Basic ${Buffer.from('user:pa:ss').toString('base64')}`,
			'X-Requested-With': 'n8n application',
		});
		expect(response.body).toEqual({ R: { A: 1 } });
	});

	it('should request a token with username and password for the gateway', async () => {
		const { sent, call } = createContext(userCredentials, 'basicAuth');

		await call({ plane: 'ot', endpoint: '/ot/1.0/host/list' });

		expect(String(sent[0].url)).toBe('/auth');
		expect(sent[0].body).toBe('username=user&password=pa%3Ass&token=true');
		expect(sent[1].headers).toMatchObject({ Authorization: 'Bearer user-token' });
	});

	it('should request a client token for an API client on every API', async () => {
		const { sent, call, requestedCredentials } = createContext(clientCredentials, 'apiClient');

		await call({ plane: 'fo', endpoint: '/api/5.0/fo/asset/host/', xml: true });

		expect(requestedCredentials).toEqual(['qualysApiClientApi']);
		expect(String(sent[0].url)).toBe('/auth/oidc');
		expect(sent[0].headers).toMatchObject({ clientId: 'id', clientSecret: 'secret' });
		expect(sent[1].headers).toMatchObject({ Authorization: 'Bearer client-token' });
	});

	it('should fail before any request when the selected method has no secret', async () => {
		const { sent, call } = createContext({ pod: 'us1' }, 'apiClient');

		await expect(call({ plane: 'ot', endpoint: '/ot/1.0/host/list' })).rejects.toThrow(
			'no API client ID or secret',
		);
		expect(sent).toHaveLength(0);
	});

	it('should not encode an already encoded path segment twice', async () => {
		const { sent, call } = createContext(clientCredentials, 'apiClient');

		await call({ plane: 'csam', endpoint: '/rest/2.0/am/asset/component/a%2Fb', method: 'POST' });

		expect(String(sent[1].url)).toBe('/rest/2.0/am/asset/component/a%2Fb');
	});

	it('should follow a paging link only to the configured host', async () => {
		const { sent, call } = createContext(userCredentials, 'basicAuth');

		await call({
			plane: 'fo',
			endpoint: 'https://qualysapi.qualys.com/api/5.0/fo/asset/host/?action=list&id_min=7',
			xml: true,
		});

		expect(String(sent[0].url)).toBe('/api/5.0/fo/asset/host/');
		expect(sent[0].qs).toEqual({ action: 'list', id_min: '7' });

		await expect(
			call({ plane: 'fo', endpoint: 'https://attacker.example/api/', xml: true }),
		).rejects.toThrow('Refusing to follow a paging link');
	});
});
