import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { jenkinsApiRequest } from '../GenericFunctions';

const CRUMB_URI = 'https://jenkins.example.com/crumbIssuer/api/json';

function createExecuteFunctions() {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	executeFunctions.getCredentials.mockResolvedValue({
		username: 'user',
		apiKey: 'key',
		baseUrl: 'https://jenkins.example.com',
	});
	executeFunctions.getNode.mockReturnValue({
		name: 'Jenkins',
		type: 'n8n-nodes-base.jenkins',
		typeVersion: 1,
	} as INode);
	return executeFunctions;
}

function httpError(statusCode: number, data = '', headers: Record<string, string> = {}) {
	return Object.assign(new Error(`${statusCode} - ${JSON.stringify(data)}`), {
		statusCode,
		status: statusCode,
		error: data,
		response: { status: statusCode, headers },
	});
}

const missingCrumbError = () =>
	httpError(
		403,
		'<html><body><h2>HTTP ERROR 403 No valid crumb was included in the request</h2></body></html>',
	);

const redirectError = (statusCode: number, location: string) =>
	httpError(statusCode, '', { location });

describe('jenkinsApiRequest', () => {
	it('removes a trailing slash from the credential base URL', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com/',
		});

		await jenkinsApiRequest.call(executeFunctions, 'GET', '/api/json');

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({ uri: 'https://jenkins.example.com/api/json' }),
		);
	});

	it('handles missing base URL gracefully without throwing', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
		});

		await jenkinsApiRequest.call(executeFunctions, 'GET', '/api/json');

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({ uri: '/api/json' }),
		);
	});

	describe('CSRF crumb', () => {
		it('does not fetch a crumb when the request succeeds', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request.mockResolvedValue(undefined);

			await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					uri: 'https://jenkins.example.com/job/my-job/build',
					sendCredentialsOnCrossOriginRedirect: false,
					headers: { Accept: 'application/json' },
				}),
			);
		});

		it('fetches a crumb and retries once when Jenkins rejects the request for a missing crumb', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockResolvedValueOnce({
					body: { crumbRequestField: 'Jenkins-Crumb', crumb: 'test-crumb-value-123' },
					headers: {
						'set-cookie': [
							'JSESSIONID=test-session-cookie; Path=/; HttpOnly',
							'remember-me=test-token; Path=/; Max-Age=1209600',
						],
					},
				})
				.mockResolvedValueOnce(undefined);

			await jenkinsApiRequest.call(
				executeFunctions,
				'POST',
				'/job/my-job/buildWithParameters',
				{},
				{},
				{ headers: { 'content-type': 'application/x-www-form-urlencoded' } },
			);

			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(3);
			expect(executeFunctions.helpers.request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					method: 'GET',
					uri: CRUMB_URI,
					sendCredentialsOnCrossOriginRedirect: false,
				}),
			);
			expect(executeFunctions.helpers.request).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					method: 'POST',
					uri: 'https://jenkins.example.com/job/my-job/buildWithParameters',
					headers: {
						Accept: 'application/json',
						'Jenkins-Crumb': 'test-crumb-value-123',
						Cookie: 'JSESSIONID=test-session-cookie; remember-me=test-token',
						'content-type': 'application/x-www-form-urlencoded',
					},
				}),
			);
		});

		it('does not fetch a crumb for other 403 errors', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request.mockRejectedValue(
				httpError(403, 'user is missing the Job/Build permission'),
			);

			await expect(
				jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build'),
			).rejects.toThrow(NodeApiError);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
		});

		it('surfaces crumb issuer failures without retrying the request', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockRejectedValueOnce(httpError(401, 'Unauthorized'));

			const error = await jenkinsApiRequest
				.call(executeFunctions, 'POST', '/job/my-job/build')
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).httpCode).toBe('401');
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(2);
		});

		it('rethrows the original error when the crumb issuer returns no crumb', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockResolvedValueOnce({ body: {}, headers: {} });

			const error = await jenkinsApiRequest
				.call(executeFunctions, 'POST', '/job/my-job/build')
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).httpCode).toBe('403');
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(2);
		});

		it('treats a queue redirect on the retried request as success', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockResolvedValueOnce({
					body: { crumbRequestField: 'Jenkins-Crumb', crumb: 'test-crumb-value-123' },
					headers: {},
				})
				.mockRejectedValueOnce(redirectError(303, 'https://jenkins.example.com/queue/item/42/'));

			const result = await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

			expect(result).toEqual({
				success: true,
				queueUrl: 'https://jenkins.example.com/queue/item/42/',
			});
		});

		it('retries only once when the retried request is also rejected for a missing crumb', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockResolvedValueOnce({
					body: { crumbRequestField: 'Jenkins-Crumb', crumb: 'test-crumb-value-123' },
					headers: {},
				})
				.mockRejectedValueOnce(missingCrumbError());

			const error = await jenkinsApiRequest
				.call(executeFunctions, 'POST', '/job/my-job/build')
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).httpCode).toBe('403');
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(3);
		});

		it('surfaces a crumb issuer timeout without retrying the request', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockRejectedValueOnce(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }));

			await expect(
				jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build'),
			).rejects.toThrow(NodeApiError);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(2);
		});

		it('sends a single session cookie from the crumb issuer', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request
				.mockRejectedValueOnce(missingCrumbError())
				.mockResolvedValueOnce({
					body: { crumbRequestField: 'Jenkins-Crumb', crumb: 'test-crumb-value-123' },
					headers: { 'set-cookie': 'JSESSIONID=test-session-cookie; Path=/; HttpOnly' },
				})
				.mockResolvedValueOnce(undefined);

			await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

			expect(executeFunctions.helpers.request).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					headers: expect.objectContaining({ Cookie: 'JSESSIONID=test-session-cookie' }),
				}),
			);
		});
	});

	describe('queue redirects', () => {
		it.each([302, 303])(
			'treats a %i queue item redirect as successful scheduling',
			async (code) => {
				const executeFunctions = createExecuteFunctions();
				executeFunctions.helpers.request.mockRejectedValue(
					redirectError(code, 'https://jenkins.example.com/queue/item/42/'),
				);

				const result = await jenkinsApiRequest.call(
					executeFunctions,
					'POST',
					'/job/my-job/buildWithParameters',
				);

				expect(result).toEqual({
					success: true,
					queueUrl: 'https://jenkins.example.com/queue/item/42/',
				});
			},
		);

		it('resolves a relative queue item location against the base URL', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getCredentials.mockResolvedValue({
				username: 'user',
				apiKey: 'key',
				baseUrl: 'https://example.com/jenkins/',
			});
			executeFunctions.helpers.request.mockRejectedValue(
				redirectError(303, '/jenkins/queue/item/7'),
			);

			const result = await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

			expect(result).toEqual({
				success: true,
				queueUrl: 'https://example.com/jenkins/queue/item/7',
			});
		});

		it('handles string status codes in redirect responses', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request.mockRejectedValue(
				Object.assign(new Error('303 - ""'), {
					httpCode: '303',
					headers: { location: 'https://jenkins.example.com/queue/item/77/' },
				}),
			);

			const result = await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

			expect(result).toEqual({
				success: true,
				queueUrl: 'https://jenkins.example.com/queue/item/77/',
			});
		});

		it.each([
			['a login page', 'https://jenkins.example.com/login?from=/job/my-job/build'],
			[
				'an SSO login with the queue path in the query',
				'https://jenkins.example.com/securityRealm/commenceLogin?from=/queue/item/1/',
			],
			['an SSO proxy on another origin', 'https://sso.example.com/oauth2/start?rd=/queue/item/1'],
			['a nested queue item path', 'https://jenkins.example.com/queue/item/1/cancelQueue'],
			['a job page', 'https://jenkins.example.com/job/new-job/'],
		])('rejects a redirect to %s', async (_, location) => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request.mockRejectedValue(redirectError(302, location));

			const error = await jenkinsApiRequest
				.call(executeFunctions, 'POST', '/job/my-job/build')
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).httpCode).toBe('302');
		});

		it.each([
			['host', 'https://jenkins.acme.com/queue/item/7/'],
			['scheme', 'http://jenkins.example.com/queue/item/7/'],
			['base path', 'https://jenkins.example.com/jenkins/queue/item/7/'],
		])(
			'accepts a queue item redirect with a different %s than the base URL',
			async (_, location) => {
				const executeFunctions = createExecuteFunctions();
				executeFunctions.helpers.request.mockRejectedValue(redirectError(303, location));

				const result = await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

				expect(result).toEqual({ success: true, queueUrl: location });
			},
		);

		it('rethrows NodeApiError when a non-redirect error occurs', async () => {
			const executeFunctions = createExecuteFunctions();
			executeFunctions.helpers.request.mockRejectedValue(httpError(500, 'Internal Server Error'));

			await expect(
				jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build'),
			).rejects.toThrow(NodeApiError);
		});
	});
});
