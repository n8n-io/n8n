import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import { Storyblok } from '../Storyblok.node';

async function requestedUri(params: IDataObject, typeVersion = 1.1) {
	const context = mockDeep<IExecuteFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNodeParameter.mockImplementation((name: string) => params[name]);
	context.helpers.constructExecutionMetaData.mockReturnValue([]);
	context.getCredentials.mockResolvedValue({
		accessToken: 'test-management-token',
		apiKey: 'test-content-token',
	});
	context.helpers.request.mockResolvedValue({ story: {} });

	await new Storyblok().execute.call(context);

	return String((context.helpers.request.mock.calls[0][0] as IDataObject).uri);
}

describe('Storyblok - request URL encoding', () => {
	it('should encode a story ID with a slash as one path segment', async () => {
		const uri = await requestedUri({
			source: 'managementApi',
			resource: 'story',
			operation: 'get',
			space: '123456',
			storyId: '7891011/publish',
		});

		expect(uri).toBe('https://mapi.storyblok.com/v1/spaces/123456/stories/7891011%2Fpublish');
	});

	it.each([
		['blog/my post?draft', 'https://api.storyblok.com/v1/cdn/stories/blog/my%20post%3Fdraft'],
		['blog/', 'https://api.storyblok.com/v1/cdn/stories/blog/'],
	])(
		'should keep the slug folders of identifier "%s" as path segments',
		async (identifier, url) => {
			const uri = await requestedUri({
				source: 'contentApi',
				resource: 'story',
				operation: 'get',
				identifier,
			});

			expect(uri).toBe(url);
		},
	);

	it('should accept a numeric identifier', async () => {
		const uri = await requestedUri({
			source: 'contentApi',
			resource: 'story',
			operation: 'get',
			identifier: 123,
		});

		expect(uri).toBe('https://api.storyblok.com/v1/cdn/stories/123');
	});

	it('should reject a relative segment in the identifier', async () => {
		await expect(
			requestedUri({
				source: 'contentApi',
				resource: 'story',
				operation: 'get',
				identifier: 'blog/../../spaces/me',
			}),
		).rejects.toThrow();
	});

	it.each([
		[
			1.1,
			'blog/my%20post%2Fdraft',
			'https://api.storyblok.com/v1/cdn/stories/blog/my%2520post%252Fdraft',
		],
		[
			1,
			'blog/my%20post%2Fdraft',
			'https://api.storyblok.com/v1/cdn/stories/blog/my%20post%2Fdraft',
		],
	])('should handle the identifier in node version %s', async (typeVersion, identifier, url) => {
		const uri = await requestedUri(
			{ source: 'contentApi', resource: 'story', operation: 'get', identifier },
			typeVersion,
		);

		expect(uri).toBe(url);
	});
});
