import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import { GoogleBooks } from '../GoogleBooks.node';

describe('Google Books - request URL encoding', () => {
	it('should encode a volume ID with a slash as one path segment', async () => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'volume',
			operation: 'get',
			volumeId: 'zyTCAlFPjgYC/x',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await new GoogleBooks().execute.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleBooksOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://www.googleapis.com/books/v1/volumes/zyTCAlFPjgYC%2Fx`,
			}),
		);
	});

	it('should reject a volume ID with a dot segment', async () => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'volume',
			operation: 'get',
			volumeId: 'zyTCAlFPjgYC/../x',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await expect(new GoogleBooks().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestOAuth2).not.toHaveBeenCalled();
	});

	it.each([
		[2, 'flowers inauthor:keyes', 'flowers inauthor:keyes'],
		[2, 'flowers+inauthor:keyes', 'flowers inauthor:keyes'],
		[2, 'flowers%20inauthor:keyes', 'flowers inauthor:keyes'],
		[2.1, 'flowers inauthor:keyes', 'flowers inauthor:keyes'],
		[2.1, 'flowers+inauthor:keyes', 'flowers+inauthor:keyes'],
		[2.1, 'flowers%20inauthor:keyes', 'flowers%20inauthor:keyes'],
	])(
		'should send the search query for version %s and value %s as q %s',
		async (typeVersion, searchQuery, expectedQuery) => {
			const params: IDataObject = {
				authentication: 'oAuth2',
				resource: 'volume',
				operation: 'getAll',
				searchQuery,
				returnAll: false,
				limit: 5,
			};
			const context = mockDeep<IExecuteFunctions>();
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getNodeParameter.mockImplementation((name: string) => params[name]);
			context.helpers.constructExecutionMetaData.mockReturnValue([]);
			context.helpers.requestOAuth2.mockResolvedValue({ items: [] });

			await new GoogleBooks().execute.call(context);

			expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleBooksOAuth2Api',
				expect.objectContaining({
					uri: requestUrl`https://www.googleapis.com/books/v1/volumes`,
					qs: { q: expectedQuery, maxResults: 5 },
				}),
			);
		},
	);
});
