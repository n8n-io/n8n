import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';
import { execute } from '../../v2/actions/search/create.operation';
import { splunkApiJsonRequest, splunkApiRequest } from '../../v2/transport';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe('Splunk v2 transport', () => {
	const requestWithAuthentication = vi.fn();
	const httpRequestWithAuthentication = vi.fn();
	const context = mock<IExecuteFunctions>({
		helpers: mock<IExecuteFunctions['helpers']>({
			requestWithAuthentication,
			httpRequestWithAuthentication,
		}),
	});

	beforeEach(() => {
		vi.resetAllMocks();
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://splunk.example.com',
			allowUnauthorizedCerts: false,
		});
		context.getNode.mockReturnValue(mock<INode>());
	});

	it('should encode a path value that contains a slash', async () => {
		const deepContext = mockDeep<IExecuteFunctions>();
		deepContext.getCredentials.mockResolvedValue({
			baseUrl: 'https://splunk.example.com:8089',
			allowUnauthorizedCerts: false,
		});
		deepContext.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		const userId = 'nathan/admin';
		await splunkApiJsonRequest.call(
			deepContext,
			'GET',
			requestPath`/services/authentication/users/${userId}`,
		);

		expect(String(deepContext.helpers.httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://splunk.example.com:8089/services/authentication/users/nathan%2Fadmin',
		);
	});

	test('parses a raw XML response', async () => {
		requestWithAuthentication.mockResolvedValue('<response><sid>12345</sid></response>');
		await expect(
			splunkApiRequest.call(context, 'POST', requestPath`/services/search/jobs`, {
				search: 'search index=main',
			}),
		).resolves.toEqual({ response: { sid: '12345' } });
		expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(requestWithAuthentication.mock.calls[0][1].json).not.toBe(true);
	});

	test.each(['<response><sid>12345</response>', '{"sid":"12345"}'])(
		'does not repeat a POST when response parsing fails: %s',
		async (response) => {
			requestWithAuthentication.mockResolvedValue(response);
			await expect(
				splunkApiRequest.call(context, 'POST', requestPath`/services/search/jobs`),
			).rejects.toThrow('Splunk returned a response that is not valid XML');
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(sleep).not.toHaveBeenCalled();
		},
	);

	test('keeps XML output when additional fields request JSON', async () => {
		context.getNodeParameter.calledWith('search', 0).mockReturnValue('search index=main');
		context.getNodeParameter
			.calledWith('additionalFields', 0)
			.mockReturnValue({ output_mode: 'json', exec_mode: 'normal' });
		requestWithAuthentication.mockResolvedValue('<response><sid>12345</sid></response>');
		httpRequestWithAuthentication.mockResolvedValue({
			entry: [{ name: '12345', content: { status: 'done' } }],
		});
		await expect(execute.call(context, 0)).resolves.toEqual([{ name: '12345', status: 'done' }]);
		const xmlRequest = requestWithAuthentication.mock.calls[0][1];
		expect(xmlRequest.form).toMatchObject({ search: 'search index=main', exec_mode: 'normal' });
		expect(xmlRequest.form).not.toHaveProperty('output_mode');
		expect(xmlRequest.qs).toEqual({ output_mode: 'xml' });
		const jsonRequest = httpRequestWithAuthentication.mock.calls[0][1];
		expect(jsonRequest).toMatchObject({ json: true, qs: { output_mode: 'json' } });
		expect(String(jsonRequest.url)).toBe('https://splunk.example.com/services/search/jobs/12345');
	});

	test('removes output_mode from the form without changing caller fields', async () => {
		const body = { output_mode: 'json', roles: ['user', 'admin'] };
		const qs = { output_mode: 'json', count: 1 };
		requestWithAuthentication.mockResolvedValue('<response/>');
		await splunkApiRequest.call(
			context,
			'POST',
			requestPath`/services/authentication/users`,
			body,
			qs,
		);
		expect(requestWithAuthentication.mock.calls[0][1]).toMatchObject({
			form: { roles: ['user', 'admin'] },
			qs: { output_mode: 'xml', count: 1 },
			useQuerystring: true,
		});
		expect(requestWithAuthentication.mock.calls[0][1].form).not.toHaveProperty('output_mode');
		expect(body.output_mode).toBe('json');
		expect(qs.output_mode).toBe('json');
	});

	test('retains retries for request failures', async () => {
		requestWithAuthentication
			.mockRejectedValueOnce(new Error('network error'))
			.mockResolvedValue('<response><sid>12345</sid></response>');
		await expect(
			splunkApiRequest.call(context, 'POST', requestPath`/services/search/jobs`),
		).resolves.toEqual({ response: { sid: '12345' } });
		expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledTimes(1);
	});

	test('keeps the JSON transport response format', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ results: [{ count: 1 }] });
		await expect(
			splunkApiJsonRequest.call(context, 'GET', requestPath`/services/search/jobs/12345/results`),
		).resolves.toEqual({ results: [{ count: 1 }] });
		expect(httpRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
			json: true,
			qs: { output_mode: 'json' },
		});
		expect(requestWithAuthentication).not.toHaveBeenCalled();
	});
});
