import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Strapi } from '../Strapi.node';

describe('Strapi - request URL encoding', () => {
	it.each([
		['an entry ID with a slash', 'posts', '1/2', 'posts/1%2F2'],
		['a content type with a slash', 'upload/files', '5', 'upload%2Ffiles/5'],
	])('should encode %s as one path segment', async (_name, contentType, entryId, expectedPath) => {
		const params: IDataObject = {
			authentication: 'token',
			resource: 'entry',
			operation: 'get',
			contentType,
			entryId,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.getCredentials.mockResolvedValue({
			url: 'https://strapi.example.com',
			apiVersion: 'v4',
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({ data: {} });

		await new Strapi().execute.call(context);

		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(String((options as { uri: unknown }).uri)).toBe(
			`https://strapi.example.com/api/${expectedPath}`,
		);
	});

	it('should reject an entry ID with a dot segment', async () => {
		const params: IDataObject = {
			authentication: 'token',
			resource: 'entry',
			operation: 'get',
			contentType: 'posts',
			entryId: '1/../2',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.getCredentials.mockResolvedValue({
			url: 'https://strapi.example.com',
			apiVersion: 'v4',
		});

		await expect(new Strapi().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
