import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { GoogleDriveV1 } from '../../v1/GoogleDriveV1.node';

describe('GoogleDriveV1', () => {
	it('should encode the drive ID as one path segment', async () => {
		const node = new GoogleDriveV1({
			displayName: 'Google Drive',
			name: 'googleDrive',
			group: ['input'],
			description: 'Access data on Google Drive',
		});
		const context = mockDeep<IExecuteFunctions>();
		const parameters: Record<string, unknown> = {
			authentication: 'oAuth2',
			resource: 'drive',
			operation: 'get',
			options: {},
			driveId: 'team/drive?x=1',
		};
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
		context.helpers.requestOAuth2.mockResolvedValue({ id: 'team/drive?x=1' });
		context.helpers.returnJsonArray.mockImplementation((data) => [{ json: data as never }]);
		context.helpers.constructExecutionMetaData.mockImplementation((data) => data as never);

		await node.execute.call(context);

		expect(context.helpers.requestOAuth2.mock.lastCall?.[1].uri?.toString()).toBe(
			'https://www.googleapis.com/drive/v3/drives/team%2Fdrive%3Fx=1',
		);
	});
});
