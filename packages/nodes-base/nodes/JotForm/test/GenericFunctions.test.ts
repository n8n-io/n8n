import { mockDeep } from 'vitest-mock-extended';
import {
	NodeOperationError,
	requestPath,
	type IHookFunctions,
	type IRequestOptions,
	type INode,
	type RequestPath,
} from 'n8n-workflow';

import { getJotFormBaseUrl, jotformApiRequest } from '../GenericFunctions';

const testNode = {
	id: 'jotform-test-node',
	name: 'JotForm',
	type: 'n8n-nodes-base.jotFormTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} satisfies INode;

const buildContext = (credentials: Record<string, unknown>) => {
	const context = mockDeep<IHookFunctions>();
	context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key', ...credentials });
	context.getNode.mockReturnValue({
		name: 'JotForm',
		type: 'n8n-nodes-base.jotFormTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as never);
	context.helpers.request.mockResolvedValue({});
	return context;
};

const requestUri = async (credentials: Record<string, unknown>, resource: RequestPath) => {
	const context = buildContext(credentials);
	await jotformApiRequest.call(context, 'GET', resource);

	const [options] = context.helpers.request.mock.calls[0] as [IRequestOptions];
	return String(options.uri);
};

describe('jotformApiRequest', () => {
	it('should encode path values and join them with the API domain', async () => {
		const formId = '251234567890123/webhooks?x=1';

		expect(
			await requestUri(
				{ apiDomain: 'hipaa-api.jotform.com' },
				requestPath`/form/${formId}/questions`,
			),
		).toBe('https://hipaa-api.jotform.com/form/251234567890123%2Fwebhooks%3Fx=1/questions');
	});

	it.each(['api.jotform.com', 'eu-api.jotform.com', 'hipaa-api.jotform.com'])(
		'should use the "%s" preset domain',
		async (apiDomain) => {
			expect(await requestUri({ apiDomain }, requestPath`/user/forms`)).toBe(
				`https://${apiDomain}/user/forms`,
			);
		},
	);

	it('should default to api.jotform.com when the API domain is unset', async () => {
		expect(await requestUri({}, requestPath`/user/forms`)).toBe(
			'https://api.jotform.com/user/forms',
		);
	});

	it.each([
		['subdomain.jotform.com/API', requestPath`/user`, 'https://subdomain.jotform.com/API/user'],
		['subdomain.jotform.com/API/', requestPath`/user`, 'https://subdomain.jotform.com/API/user'],
		[
			'https://subdomain.jotform.com/API',
			requestPath`/user`,
			'https://subdomain.jotform.com/API/user',
		],
		['subdomain.jotform.com//API', requestPath`/user`, 'https://subdomain.jotform.com/API/user'],
		['x.jotform.com/API/v2', requestPath`/user`, 'https://x.jotform.com/API/v2/user'],
		['localhost:8080/API', requestPath`/user`, 'https://localhost:8080/API/user'],
		['host:8080/API', requestPath`/user`, 'https://host:8080/API/user'],
	])('should build the custom domain "%s"', async (customApiDomain, resource, expected) => {
		expect(await requestUri({ apiDomain: 'custom', customApiDomain }, resource)).toBe(expected);
	});

	it('should issue the request when no domain allowlist is configured', async () => {
		const context = buildContext({ apiDomain: 'api.jotform.com' });

		await jotformApiRequest.call(context, 'GET', requestPath`/user`);

		expect(context.helpers.request).toHaveBeenCalledTimes(1);
	});

	it.each([
		[''],
		['   '],
		['https://'],
		['/API'],
		['subdomain.jotform.com/API?x=1'],
		['subdomain.jotform.com/API#x'],
		['subdomain.jotform.com@other.example'],
		['ftp://enterprise.jotform.com/API'],
		['evil.example\\.jotform.com'],
		['%65vil.com'],
		['[::1]'],
		['host with space'],
		['héllo.com'],
		['host:abc'],
	])('should reject the invalid custom domain "%s"', async (customApiDomain) => {
		const context = buildContext({ apiDomain: 'custom', customApiDomain });

		await expect(jotformApiRequest.call(context, 'GET', requestPath`/user`)).rejects.toThrow(
			NodeOperationError,
		);
	});
});

describe('getJotFormBaseUrl', () => {
	it('should normalize a custom domain to a base URL', () => {
		expect(
			getJotFormBaseUrl(
				{ apiDomain: 'custom', customApiDomain: 'subdomain.jotform.com/API' },
				testNode,
			),
		).toBe('https://subdomain.jotform.com/API');
	});

	it('should default to the public host when no domain is set', () => {
		expect(getJotFormBaseUrl({}, testNode)).toBe('https://api.jotform.com');
	});

	it('should reject an empty custom domain', () => {
		expect(() => getJotFormBaseUrl({ apiDomain: 'custom', customApiDomain: '' }, testNode)).toThrow(
			NodeOperationError,
		);
	});

	it.each([
		'user:password@other.example',
		'user:password@other.example?x=1',
		'ftp://user:password@other.example/API',
	])('should not echo embedded credentials for "%s"', (customApiDomain) => {
		const build = () => getJotFormBaseUrl({ apiDomain: 'custom', customApiDomain }, testNode);

		expect(build).toThrow(NodeOperationError);
		expect(build).not.toThrow('password');
	});
});
