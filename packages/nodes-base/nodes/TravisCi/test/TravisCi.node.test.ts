import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { TravisCi } from '../TravisCi.node';

describe('TravisCi > trigger', () => {
	it.each([
		[1, 'owner/repo', 'owner%2Frepo'],
		[1, 'owner%2Frepo', 'owner%2Frepo'],
		[1.1, 'owner/repo', 'owner%2Frepo'],
		[1.1, 'owner%2Frepo', 'owner%252Frepo'],
	])('should send the slug for version %s and value %s as %s', async (typeVersion, slug, sent) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue({ typeVersion } as ReturnType<IExecuteFunctions['getNode']>);
		context.getCredentials.mockResolvedValue({ apiToken: 'fake-api-token' });
		context.getNodeParameter.mockImplementation((name: string) => {
			const values: Record<string, unknown> = {
				resource: 'build',
				operation: 'trigger',
				slug,
				branch: 'master',
				additionalFields: {},
			};
			return values[name] as never;
		});
		context.helpers.request.mockResolvedValue({});
		context.helpers.returnJsonArray.mockReturnValue([]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);

		await new TravisCi().execute.call(context);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: `https://api.travis-ci.com/repo/${sent}/requests`,
				}),
			}),
		);
	});
});
