import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Strava } from '../Strava.node';

describe('Strava - request URL encoding', () => {
	it('should encode an activity ID with a slash as one path segment', async () => {
		const params: IDataObject = { resource: 'activity', operation: 'get', activityId: '1/kudos' };
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue({ type: 'n8n-nodes-base.strava', typeVersion: 1.1 } as INode);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await new Strava().execute.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'stravaOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://www.strava.com/api/v3/activities/1%2Fkudos`,
			}),
			{ includeCredentialsOnRefreshOnBody: true },
		);
	});
});
