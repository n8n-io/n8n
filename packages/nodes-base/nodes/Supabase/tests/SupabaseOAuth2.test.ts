import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { getApiDefinition, supabaseApiRequest } from '../GenericFunctions';
import { Supabase } from '../Supabase.node';

const managedKey = (apiKey: string) => ({
	type: 'secret',
	name: 'n8n_managed_data_api',
	api_key: apiKey,
});

let contextId = 0;

function createOAuthContext({
	credentialId = `credential${++contextId}`,
	projectRef = `project${contextId}`,
}: { credentialId?: string; projectRef?: string | string[] } = {}) {
	const managementRequest = vi.fn();
	const dataRequest = vi.fn();
	const context = {
		getNodeParameter: vi.fn((name: string, itemIndex = 0) => {
			if (name === 'authentication') return 'oAuth2';
			if (name === 'projectRef') {
				return Array.isArray(projectRef) ? projectRef[itemIndex] : projectRef;
			}
			return undefined;
		}),
		getNode: vi.fn(() => ({
			credentials: {
				supabaseOAuth2Api: {
					id: credentialId,
					name: 'Supabase OAuth2',
				},
			},
		})),
		helpers: {
			httpRequestWithAuthentication: managementRequest,
			httpRequest: dataRequest,
		},
	} as unknown as IExecuteFunctions;

	return { context, managementRequest, dataRequest };
}

describe('Supabase OAuth2', () => {
	it('should load projects through the Management API', async () => {
		const node = new Supabase();
		const { context, managementRequest } = createOAuthContext();
		managementRequest.mockResolvedValue([
			{ name: 'Project One', ref: 'projectone' },
			{ name: 'Project Two', ref: 'projecttwo' },
		]);

		const projects = await node.methods.loadOptions.getProjects.call(
			context as unknown as ILoadOptionsFunctions,
		);

		expect(projects).toEqual([
			{ name: 'Project One', value: 'projectone' },
			{ name: 'Project Two', value: 'projecttwo' },
		]);
		expect(managementRequest).toHaveBeenCalledWith('supabaseOAuth2Api', {
			method: 'GET',
			url: 'https://api.supabase.com/v1/projects',
			qs: {},
			json: true,
		});
	});

	it('should use only the n8n-managed key for Data API requests', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext({
			projectRef: 'projectone',
		});
		managementRequest.mockResolvedValue([
			{ type: 'secret', name: 'another_key', api_key: 'wrong-key' },
			managedKey('managed-key'),
		]);
		dataRequest.mockResolvedValue([{ id: 1 }]);

		const result = await supabaseApiRequest.call(context, 'GET', '/users');

		expect(result).toEqual([{ id: 1 }]);
		expect(managementRequest).toHaveBeenCalledTimes(1);
		expect(dataRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://projectone.supabase.co/rest/v1/users',
				headers: expect.objectContaining({
					apikey: 'managed-key',
					Authorization: 'Bearer managed-key',
				}),
			}),
		);
	});

	it('should create an n8n-managed key when none exists', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext({
			projectRef: 'projecttwo',
		});
		managementRequest
			.mockResolvedValueOnce([{ type: 'secret', name: 'another_key', api_key: 'wrong-key' }])
			.mockResolvedValueOnce({ api_key: 'created-key' });
		dataRequest.mockResolvedValue([]);

		await supabaseApiRequest.call(context, 'GET', '/users');

		expect(managementRequest).toHaveBeenNthCalledWith(2, 'supabaseOAuth2Api', {
			method: 'POST',
			url: 'https://api.supabase.com/v1/projects/projecttwo/api-keys',
			qs: { reveal: true },
			body: {
				type: 'secret',
				name: 'n8n_managed_data_api',
				description:
					"The n8n Supabase Node uses this key to access the Data API. Don't delete it if you want the node to keep working.",
			},
			json: true,
		});
		expect(dataRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ apikey: 'created-key' }),
			}),
		);
	});

	it('should share one key lookup across concurrent requests', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext();
		managementRequest.mockResolvedValue([managedKey('shared-key')]);
		dataRequest.mockResolvedValue([]);

		await Promise.all([
			supabaseApiRequest.call(context, 'GET', '/users'),
			supabaseApiRequest.call(context, 'GET', '/teams'),
		]);

		expect(managementRequest).toHaveBeenCalledTimes(1);
		expect(dataRequest).toHaveBeenCalledTimes(2);
	});

	it('should keep key caches separate by credential and project', async () => {
		const first = createOAuthContext({ credentialId: 'credentiala', projectRef: 'projecta' });
		const otherProject = createOAuthContext({
			credentialId: 'credentiala',
			projectRef: 'projectb',
		});
		const otherCredential = createOAuthContext({
			credentialId: 'credentialb',
			projectRef: 'projecta',
		});
		first.managementRequest.mockResolvedValue([managedKey('key-a')]);
		otherProject.managementRequest.mockResolvedValue([managedKey('key-b')]);
		otherCredential.managementRequest.mockResolvedValue([managedKey('key-c')]);
		first.dataRequest.mockResolvedValue([]);
		otherProject.dataRequest.mockResolvedValue([]);
		otherCredential.dataRequest.mockResolvedValue([]);

		await supabaseApiRequest.call(first.context, 'GET', '/users');
		await supabaseApiRequest.call(otherProject.context, 'GET', '/users');
		await supabaseApiRequest.call(otherCredential.context, 'GET', '/users');

		expect(first.managementRequest).toHaveBeenCalledTimes(1);
		expect(otherProject.managementRequest).toHaveBeenCalledTimes(1);
		expect(otherCredential.managementRequest).toHaveBeenCalledTimes(1);
		expect(otherProject.dataRequest).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ apikey: 'key-b' }) }),
		);
		expect(otherCredential.dataRequest).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.objectContaining({ apikey: 'key-c' }) }),
		);
	});

	it('should resolve the project for the current input item', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext({
			projectRef: ['firstproject', 'secondproject'],
		});
		managementRequest.mockResolvedValue([managedKey('managed-key')]);
		dataRequest.mockResolvedValue([]);

		await supabaseApiRequest.call(context, 'GET', '/users', {}, {}, undefined, {}, 1);

		expect(managementRequest).toHaveBeenCalledWith(
			'supabaseOAuth2Api',
			expect.objectContaining({
				url: 'https://api.supabase.com/v1/projects/secondproject/api-keys',
			}),
		);
		expect(dataRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://secondproject.supabase.co/rest/v1/users' }),
		);
	});

	it('should keep schema requests separate by OAuth credential', async () => {
		const first = createOAuthContext({
			credentialId: 'schema-credential-a',
			projectRef: 'sharedproject',
		});
		const second = createOAuthContext({
			credentialId: 'schema-credential-b',
			projectRef: 'sharedproject',
		});
		first.managementRequest.mockResolvedValue([managedKey('key-a')]);
		second.managementRequest.mockResolvedValue([managedKey('key-b')]);
		first.dataRequest.mockResolvedValue({ definitions: { first: {} } });
		second.dataRequest.mockResolvedValue({ definitions: { second: {} } });

		const [firstDefinition, secondDefinition] = await Promise.all([
			getApiDefinition.call(first.context as unknown as ILoadOptionsFunctions),
			getApiDefinition.call(second.context as unknown as ILoadOptionsFunctions),
		]);

		expect(firstDefinition).toEqual({ definitions: { first: {} } });
		expect(secondDefinition).toEqual({ definitions: { second: {} } });
		expect(first.dataRequest).toHaveBeenCalledTimes(1);
		expect(second.dataRequest).toHaveBeenCalledTimes(1);
	});

	it('should refresh the managed key and retry once after a 401 response', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext();
		const requestedKeys: unknown[] = [];
		managementRequest
			.mockResolvedValueOnce([managedKey('old-key')])
			.mockResolvedValueOnce([managedKey('new-key')]);
		dataRequest
			.mockImplementationOnce(async (options) => {
				requestedKeys.push(options.headers.apikey);
				throw Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
			})
			.mockImplementationOnce(async (options) => {
				requestedKeys.push(options.headers.apikey);
				return [{ id: 1 }];
			});

		const result = await supabaseApiRequest.call(context, 'GET', '/users');

		expect(result).toEqual([{ id: 1 }]);
		expect(managementRequest).toHaveBeenCalledTimes(2);
		expect(dataRequest).toHaveBeenCalledTimes(2);
		expect(requestedKeys).toEqual(['old-key', 'new-key']);
	});

	it('should not refresh the managed key for other errors', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext();
		managementRequest.mockResolvedValue([managedKey('managed-key')]);
		dataRequest.mockRejectedValue({ message: 'Forbidden', response: { status: 403 } });

		await expect(supabaseApiRequest.call(context, 'GET', '/users')).rejects.toThrow();

		expect(managementRequest).toHaveBeenCalledTimes(1);
		expect(dataRequest).toHaveBeenCalledTimes(1);
	});

	it('should retry a key lookup after an earlier lookup fails', async () => {
		const { context, managementRequest, dataRequest } = createOAuthContext();
		managementRequest
			.mockRejectedValueOnce(new Error('Management API unavailable'))
			.mockResolvedValueOnce([managedKey('recovered-key')]);
		dataRequest.mockResolvedValue([]);

		await expect(supabaseApiRequest.call(context, 'GET', '/users')).rejects.toThrow();
		await supabaseApiRequest.call(context, 'GET', '/users');

		expect(managementRequest).toHaveBeenCalledTimes(2);
		expect(dataRequest).toHaveBeenCalledTimes(1);
	});

	it.each([
		['', 'Select a Supabase project'],
		['invalid-project', 'The Supabase project ID is invalid'],
		['UPPERCASE', 'The Supabase project ID is invalid'],
	])('should reject project reference %j before making requests', async (projectRef, message) => {
		const { context, managementRequest, dataRequest } = createOAuthContext({ projectRef });

		await expect(supabaseApiRequest.call(context, 'GET', '/users')).rejects.toEqual(
			expect.objectContaining({ message }),
		);
		expect(managementRequest).not.toHaveBeenCalled();
		expect(dataRequest).not.toHaveBeenCalled();
	});
});
