import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getJenkinsCrumb, jenkinsApiRequest } from '../GenericFunctions';

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

	it('fetches and attaches CSRF crumb and session cookie on POST requests when crumb issuer is available', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return {
					body: {
						crumbRequestField: 'Jenkins-Crumb',
						crumb: 'test-crumb-value-123',
					},
					headers: {
						'set-cookie': ['JSESSIONID=test-session-cookie; Path=/'],
					},
				};
			}
			return { success: true };
		});

		await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				uri: 'https://jenkins.example.com/job/my-job/build',
				headers: expect.objectContaining({
					'Jenkins-Crumb': 'test-crumb-value-123',
					Cookie: 'JSESSIONID=test-session-cookie; Path=/',
				}),
			}),
		);
	});

	it('preserves caller option headers alongside the CSRF crumb', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return {
					body: {
						crumbRequestField: 'Jenkins-Crumb',
						crumb: 'test-crumb-value-123',
					},
				};
			}
			return { success: true };
		});

		await jenkinsApiRequest.call(
			executeFunctions,
			'POST',
			'/job/my-job/buildWithParameters',
			{},
			{},
			{
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
				},
			},
		);

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'application/json',
					'Jenkins-Crumb': 'test-crumb-value-123',
					'content-type': 'application/x-www-form-urlencoded',
				}),
			}),
		);
	});

	it('fetches and attaches CSRF crumb on PUT and DELETE requests', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return {
					crumbRequestField: 'Jenkins-Crumb',
					crumb: 'test-crumb-value-123',
				};
			}
			return { success: true };
		});

		await jenkinsApiRequest.call(executeFunctions, 'PUT', '/job/my-job/config.xml');
		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'PUT',
				headers: expect.objectContaining({
					'Jenkins-Crumb': 'test-crumb-value-123',
				}),
			}),
		);

		await jenkinsApiRequest.call(executeFunctions, 'DELETE', '/job/my-job');
		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({
					'Jenkins-Crumb': 'test-crumb-value-123',
				}),
			}),
		);
	});

	it('proceeds without crumb on POST requests when crumb issuer returns 404', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				throw new Error('404 Not Found');
			}
			return { success: true };
		});

		const result = await jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build');

		expect(result).toEqual({ success: true });
		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				uri: 'https://jenkins.example.com/job/my-job/build',
			}),
		);
	});

	it('does not attempt to fetch CSRF crumb for GET requests', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockResolvedValue({ status: 'ok' });

		await jenkinsApiRequest.call(executeFunctions, 'GET', '/job/my-job/api/json');

		expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				uri: 'https://jenkins.example.com/job/my-job/api/json',
			}),
		);
	});

	it('treats 303 queue item redirect as successful build scheduling', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('303 - ""');
			error.statusCode = 303;
			error.response = {
				status: 303,
				headers: {
					location: 'https://jenkins.example.com/queue/item/42/',
				},
			};
			throw error;
		});

		const result = await jenkinsApiRequest.call(
			executeFunctions,
			'POST',
			'/job/my-job/buildWithParameters',
		);

		expect(result).toEqual({
			success: true,
			queueUrl: 'https://jenkins.example.com/queue/item/42/',
		});
	});

	it('treats 302 and 201 queue item redirects as successful build scheduling', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('302 - Found');
			error.statusCode = 302;
			error.response = {
				status: 302,
				headers: {
					location: 'https://jenkins.example.com/queue/item/99/',
				},
			};
			throw error;
		});

		const result302 = await jenkinsApiRequest.call(
			executeFunctions,
			'POST',
			'/job/my-job/build',
		);
		expect(result302).toEqual({
			success: true,
			queueUrl: 'https://jenkins.example.com/queue/item/99/',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('201 - Created');
			error.statusCode = 201;
			error.response = {
				status: 201,
				headers: {
					location: 'https://jenkins.example.com/queue/item/100/',
				},
			};
			throw error;
		});

		const result201 = await jenkinsApiRequest.call(
			executeFunctions,
			'POST',
			'/job/my-job/build',
		);
		expect(result201).toEqual({
			success: true,
			queueUrl: 'https://jenkins.example.com/queue/item/100/',
		});
	});

	it('handles string status codes in redirect responses', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('303 - ""');
			error.httpCode = '303';
			error.headers = {
				location: 'https://jenkins.example.com/queue/item/77/',
			};
			throw error;
		});

		const result = await jenkinsApiRequest.call(
			executeFunctions,
			'POST',
			'/job/my-job/build',
		);
		expect(result).toEqual({
			success: true,
			queueUrl: 'https://jenkins.example.com/queue/item/77/',
		});
	});

	it('rethrows NodeApiError when 303 redirects to login page instead of queue', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('303 - ""');
			error.statusCode = 303;
			error.response = {
				status: 303,
				headers: {
					location: 'https://jenkins.example.com/login?from=/job/my-job/build',
				},
			};
			throw error;
		});

		await expect(
			jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/buildWithParameters'),
		).rejects.toThrow();
	});

	it('rethrows NodeApiError when redirect contains /login even if /queue/item/ is in query string', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('302 - Found');
			error.statusCode = 302;
			error.response = {
				status: 302,
				headers: {
					location: 'https://jenkins.example.com/login?from=/queue/item/42/',
				},
			};
			throw error;
		});

		await expect(
			jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build'),
		).rejects.toThrow();
	});

	it('rethrows NodeApiError when a non-redirect error occurs', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com',
		});

		executeFunctions.helpers.request.mockImplementation(async (options: any) => {
			if (options.uri.endsWith('/crumbIssuer/api/json')) {
				return null;
			}
			const error: any = new Error('500 - Internal Server Error');
			error.statusCode = 500;
			throw error;
		});

		await expect(
			jenkinsApiRequest.call(executeFunctions, 'POST', '/job/my-job/build'),
		).rejects.toThrow();
	});
});
