import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { GoogleDocs } from '../GoogleDocs.node';

describe('Google Docs - request URL encoding', () => {
	it('should encode a document ID with a slash as one path segment', async () => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'document',
			operation: 'get',
			documentURL: '1Xk7cR2mPq9sT4vW/edit',
			simple: false,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await new GoogleDocs().execute.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleDocsOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://docs.googleapis.com/v1/documents/1Xk7cR2mPq9sT4vW%2Fedit`,
			}),
		);
	});

	it('should reject a document ID with a dot segment', async () => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'document',
			operation: 'get',
			documentURL: '1Xk7cR2mPq9sT4vW/../edit',
			simple: false,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await expect(new GoogleDocs().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestOAuth2).not.toHaveBeenCalled();
	});
});
