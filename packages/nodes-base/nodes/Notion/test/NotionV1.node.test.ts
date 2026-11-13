import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import * as GenericFunctions from '../shared/GenericFunctions';
import { NotionV1 } from '../v1/NotionV1.node';

jest.mock('../shared/GenericFunctions', () => ({
	...jest.requireActual<typeof GenericFunctions>('../shared/GenericFunctions'),
	notionApiRequest: jest.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as jest.Mock;

describe('NotionV1', () => {
	it('encodes a user ID as one URL path segment', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'user', id: 'team/member' });
		const parameters: IDataObject = { resource: 'user', operation: 'get', userId: 'team/member' };
		const context = {
			getInputData: () => [{ json: {} }],
			getNodeParameter: (name: string) => parameters[name],
			getNode: () => ({ typeVersion: 1, name: 'Notion' }) as INode,
			getTimezone: () => 'UTC',
			helpers: {
				constructExecutionMetaData: (data: unknown) => data,
				returnJsonArray: (data: IDataObject) => [{ json: data }],
			},
		} as unknown as IExecuteFunctions;

		const node = new NotionV1({
			name: 'notion',
			displayName: 'Notion',
			group: ['output'],
			description: 'Consume Notion API',
		});
		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('GET', requestPath`/users/team%2Fmember`);
	});
});
