import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import * as GenericFunctions from '../GenericFunctions';
import { Ghost } from '../Ghost.node';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual<typeof GenericFunctions>('../GenericFunctions'),
	ghostApiRequest: jest.fn().mockResolvedValue({ posts: [{ updated_at: '2024-01-01' }] }),
}));

const run = async (typeVersion: number, params: Record<string, unknown>) => {
	const context = mockDeep<IExecuteFunctions>();
	context.getNodeParameter.mockImplementation((name: string) => params[name] as never);
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
	context.getTimezone.mockReturnValue('UTC');
	context.helpers.constructExecutionMetaData.mockReturnValue([]);

	jest.mocked(GenericFunctions.ghostApiRequest).mockClear();
	await new Ghost().execute.call(context);

	return jest
		.mocked(GenericFunctions.ghostApiRequest)
		.mock.calls.map(([, endpoint]) => String(endpoint));
};

describe('Ghost > post get', () => {
	it.each([
		[1, '/content/posts/slug/caf%C3%A9'],
		[1.1, '/content/posts/slug/caf%25C3%25A9'],
	])('should build the endpoint in version %s from an encoded slug', async (typeVersion, path) => {
		const endpoints = await run(typeVersion, {
			source: 'contentApi',
			resource: 'post',
			operation: 'get',
			by: 'slug',
			identifier: 'caf%C3%A9',
			options: {},
		});

		expect(endpoints[0]).toBe(path);
	});
});

describe('Ghost > post delete', () => {
	it.each([
		[1, '/admin/posts/a%2Fb'],
		[1.1, '/admin/posts/a%252Fb'],
	])(
		'should build the endpoint in version %s from an encoded post ID',
		async (typeVersion, path) => {
			const endpoints = await run(typeVersion, {
				source: 'adminApi',
				resource: 'post',
				operation: 'delete',
				postId: 'a%2Fb',
			});

			expect(endpoints).toEqual([path]);
		},
	);
});

describe('Ghost > post update', () => {
	it.each([
		[1, '/admin/posts/a%2Fb'],
		[1.1, '/admin/posts/a%252Fb'],
	])(
		'should build the endpoints in version %s from an encoded post ID',
		async (typeVersion, path) => {
			const endpoints = await run(typeVersion, {
				source: 'adminApi',
				resource: 'post',
				operation: 'update',
				postId: 'a%2Fb',
				contentFormat: 'html',
				updateFields: {},
			});

			expect(endpoints).toEqual([path, path]);
		},
	);
});
