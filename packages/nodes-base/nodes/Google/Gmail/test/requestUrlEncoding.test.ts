import type { IDataObject, IExecuteFunctions, INode, INodeTypeBaseDescription } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import { GmailV1 } from '../v1/GmailV1.node';
import { GmailV2 } from '../v2/GmailV2.node';

describe('Gmail - request URL encoding', () => {
	it.each([
		['v1', new GmailV1(mock<INodeTypeBaseDescription>())],
		['v2', new GmailV2(mock<INodeTypeBaseDescription>())],
	])('should encode a label ID with a slash as one path segment (%s)', async (_, node) => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'label',
			operation: 'get',
			labelId: 'Label_1/Label_2',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await node.execute.call(context);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'gmailOAuth2',
			expect.objectContaining({
				uri: requestUrl`https://www.googleapis.com/gmail/v1/users/me/labels/Label_1%2FLabel_2`,
			}),
		);
	});

	it.each([
		['v1', new GmailV1(mock<INodeTypeBaseDescription>())],
		['v2', new GmailV2(mock<INodeTypeBaseDescription>())],
	])('should reject a label ID with a dot segment (%s)', async (_, node) => {
		const params: IDataObject = {
			authentication: 'oAuth2',
			resource: 'label',
			operation: 'get',
			labelId: 'Label_1/../Label_2',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await expect(node.execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
