import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { venafiApiRequest, venafiApiRequestAllItems } from '../GenericFunctions';

describe('venafiApiRequest', () => {
	it('should encode path values and join them with the credentials domain', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ domain: 'https://tpp.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const certificateId = '{7d6ab2c8}/Retrieve?x=1';
		await venafiApiRequest.call(context, 'GET', requestPath`/vedsdk/Certificates/${certificateId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'venafiTlsProtectDatacenterApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://tpp.example.com/vedsdk/Certificates/%7B7d6ab2c8%7D%2FRetrieve%3Fx=1',
				}),
			}),
		);
	});

	describe('venafiApiRequestAllItems', () => {
		const setup = (pages: object[]) => {
			const context = mockDeep<IExecuteFunctions>();
			context.getNode.mockReturnValue(mock<INode>());
			context.getCredentials.mockResolvedValue({ domain: 'https://tpp.example.com/' });
			for (const page of pages) {
				context.helpers.requestWithAuthentication.mockResolvedValueOnce(page);
			}
			return context;
		};
		const sent = (context: ReturnType<typeof setup>) =>
			context.helpers.requestWithAuthentication.mock.calls.map(([, o]) => ({
				uri: String(o.uri),
				qs: o.qs,
			}));

		it('should follow the path and query of the next page link', async () => {
			const context = setup([
				{ items: [1], _links: [{ Next: '/vedsdk/certificates/?limit=1&tag=a&tag=b' }] },
				{ items: [2], _links: [{}] },
			]);

			const result = await venafiApiRequestAllItems.call(
				context,
				'items',
				'GET',
				requestPath`/vedsdk/Certificates`,
				{},
				{ limit: 1 },
			);

			expect(result).toEqual([1, 2]);
			expect(sent(context)).toEqual([
				{ uri: 'https://tpp.example.com/vedsdk/Certificates', qs: { limit: 1 } },
				{
					uri: 'https://tpp.example.com/vedsdk/certificates/',
					qs: { limit: '1', tag: ['a', 'b'] },
				},
			]);
		});

		it('should send the request to the credentials domain for a link on another host', async () => {
			const context = setup([
				{ items: [1], _links: [{ Next: 'https://other.example/vedsdk/certificates/?offset=1' }] },
				{ items: [2] },
			]);

			await venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/vedsdk/start`);

			expect(sent(context)[1]).toEqual({
				uri: 'https://tpp.example.com/vedsdk/certificates/',
				qs: { offset: '1' },
			});
		});

		it.each(['.other.example/x', '@other.example/x', '//other.example/x'])(
			'should not send a request to another host for the link %s',
			async (link) => {
				const context = setup([{ items: [1], _links: [{ Next: link }] }, { items: [2] }]);

				await venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/vedsdk/start`);

				const uris = sent(context).map(({ uri }) => uri);
				expect(uris).toHaveLength(2);
				for (const uri of uris) expect(uri.startsWith('https://tpp.example.com/')).toBe(true);
			},
		);

		it('should keep the current path for a next page link with only a query', async () => {
			const context = setup([{ items: [1], _links: [{ Next: '?offset=1' }] }, { items: [2] }]);

			await venafiApiRequestAllItems.call(
				context,
				'items',
				'GET',
				requestPath`/vedsdk/Certificates`,
			);

			expect(sent(context)[1]).toEqual({
				uri: 'https://tpp.example.com/vedsdk/Certificates',
				qs: { offset: '1' },
			});
		});

		it('should keep an encoded segment encoded once', async () => {
			const context = setup([
				{ items: [1], _links: [{ Next: '/vedsdk/Certificates/%7Bguid%7D%2Fx' }] },
				{ items: [2] },
			]);

			await venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/vedsdk/start`);

			expect(sent(context)[1].uri).toBe(
				'https://tpp.example.com/vedsdk/Certificates/%7Bguid%7D%2Fx',
			);
		});

		it('should throw and stop when the next page link is not valid', async () => {
			const context = setup([{ items: [1], _links: [{ Next: '/vedsdk/%E0%A4%A' }] }]);

			await expect(
				venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/vedsdk/start`),
			).rejects.toThrow('Unexpected next page link');
			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});
	});
});
