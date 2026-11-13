import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { Iterable } from '../Iterable.node';

describe('Iterable path values', () => {
	const success = { code: 'Success' };

	const execute = async (typeVersion: number, params: Record<string, string>) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue({ typeVersion } as INode);
		context.getCredentials.mockResolvedValue({
			apiKey: 'fake-api-key',
			region: 'https://api.iterable.com',
		});
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue(success);

		await new Iterable().execute.call(context);

		return String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url);
	};

	it.each([
		['email', 'a%2Bb%40n8n.io', 'users/a%2Bb@n8n.io', 'users/a%252Bb%2540n8n.io'],
		['userId', 'usr%2F1001', 'users/byUserId/usr%2F1001', 'users/byUserId/usr%252F1001'],
	])('should handle the %s value of user:delete per node version', async (by, value, v1, v1_1) => {
		const params = { resource: 'user', operation: 'delete', by, [by]: value };

		expect(await execute(1, params)).toBe(`https://api.iterable.com/api/${v1}`);
		expect(await execute(1.1, params)).toBe(`https://api.iterable.com/api/${v1_1}`);
	});

	it('should handle the userId value of user:get per node version', async () => {
		const params = { resource: 'user', operation: 'get', by: 'userId', userId: 'usr%2F1001' };

		expect(await execute(1, params)).toBe('https://api.iterable.com/api/users/byUserId/usr%2F1001');
		expect(await execute(1.1, params)).toBe(
			'https://api.iterable.com/api/users/byUserId/usr%252F1001',
		);
	});
});
